/**
 * Flashcards Cloud Functions
 * F-1: SM-2 spaced repetition + AI generation
 *
 * Production hardening:
 * - runWith() for memory/timeout
 * - Input sanitization for AI prompts
 * - Shared AI client and JSON parser
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { checkAndIncrementRateLimit } = require('./rateLimit');
const { generateJSON } = require('./utils/geminiClient');
const { parseAIJsonResponse, sanitizeForPrompt } = require('./utils/promptHelpers');

/**
 * Generate flashcards from a topic using Gemini AI
 */
exports.generateFlashcards = functions
    .runWith({ memory: '512MB', timeoutSeconds: 120 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const rawTopic = data?.topic;
        const count = data?.count || 10;
        const userId = context.auth.uid;

        if (!rawTopic || typeof rawTopic !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Topic is required');
        }
        if (count < 1 || count > 50) {
            throw new functions.https.HttpsError('invalid-argument', 'Count must be 1-50');
        }

        const topic = sanitizeForPrompt(rawTopic, 200);
        await checkAndIncrementRateLimit(userId, 'flashcard_generation');

        const prompt = `Generate ${count} flashcards on "${topic}" for exam preparation.

Return ONLY a JSON array with this format:
[
  {
    "front": "Question or concept (concise)",
    "back": "Answer or explanation (clear, factual)",
    "difficulty": 0
  }
]

Focus on key facts, definitions, and concepts that are commonly tested.`;

        try {
            const responseText = await generateJSON(prompt);
            const flashcardsData = parseAIJsonResponse(responseText, 'array');

            if (!Array.isArray(flashcardsData) || flashcardsData.length === 0) {
                throw new functions.https.HttpsError('internal', 'No flashcards generated');
            }

            const batch = admin.firestore().batch();
            const createdIds = [];

            flashcardsData.forEach((card) => {
                const docRef = admin.firestore()
                    .collection('users').doc(userId)
                    .collection('flashcards').doc();

                batch.set(docRef, {
                    topic,
                    frontText: card.front,
                    backText: card.back,
                    difficulty: card.difficulty || 0,
                    easeFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    nextReview: admin.firestore.Timestamp.now(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastReviewed: null,
                });

                createdIds.push(docRef.id);
            });

            await batch.commit();
            return { count: flashcardsData.length, createdIds };
        } catch (error) {
            if (error instanceof functions.https.HttpsError) throw error;
            console.error('Flashcard generation error:', error.message);
            throw new functions.https.HttpsError('internal', 'Failed to generate flashcards');
        }
    });

/**
 * Review a flashcard — updates SM-2 spaced repetition parameters.
 */
exports.reviewFlashcard = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { flashcardId, quality } = data;
        const userId = context.auth.uid;

        if (!flashcardId || typeof flashcardId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'flashcardId is required');
        }
        if (typeof quality !== 'number' || quality < 0 || quality > 5) {
            throw new functions.https.HttpsError('invalid-argument', 'quality must be 0-5');
        }

        const cardRef = admin.firestore()
            .collection('users').doc(userId)
            .collection('flashcards').doc(flashcardId);

        const cardDoc = await cardRef.get();
        if (!cardDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Flashcard not found');
        }

        const card = cardDoc.data();

        // SM-2 Algorithm
        let newEaseFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (newEaseFactor < 1.3) newEaseFactor = 1.3;

        let newInterval, newRepetitions;

        if (quality < 3) {
            newRepetitions = 0;
            newInterval = 1;
        } else {
            newRepetitions = card.repetitions + 1;
            if (newRepetitions === 1) newInterval = 1;
            else if (newRepetitions === 2) newInterval = 6;
            else newInterval = Math.round(card.interval * newEaseFactor);
        }

        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + newInterval);

        await cardRef.update({
            easeFactor: newEaseFactor,
            interval: newInterval,
            repetitions: newRepetitions,
            difficulty: quality < 3 ? Math.min(5, card.difficulty + 1) : Math.max(0, card.difficulty - 1),
            nextReview: admin.firestore.Timestamp.fromDate(nextReview),
            lastReviewed: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            nextReview: nextReview.toISOString(),
            interval: newInterval,
            easeFactor: Math.round(newEaseFactor * 100) / 100,
            repetitions: newRepetitions,
        };
    });
