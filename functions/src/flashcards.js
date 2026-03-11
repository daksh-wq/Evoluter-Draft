/**
 * Flashcards Cloud Functions
 * F-1: SM-2 spaced repetition + AI generation
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { checkAndIncrementRateLimit } = require('./rateLimit');

const genAI = new GoogleGenerativeAI(functions.config().gemini?.api_key || process.env.GEMINI_API_KEY || '');

/**
 * Generate flashcards from a topic using Gemini AI
 */
exports.generateFlashcards = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { topic, count = 10 } = data;
    const userId = context.auth.uid;

    if (!topic || typeof topic !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Topic is required');
    }

    if (count < 1 || count > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'Count must be 1-50');
    }

    // Rate limit
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
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });

        const responseText = result.response.text();
        let flashcardsData;

        try {
            flashcardsData = JSON.parse(responseText);
        } catch {
            const arrayMatch = responseText.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                flashcardsData = JSON.parse(arrayMatch[0]);
            } else {
                throw new functions.https.HttpsError('internal', 'Failed to parse AI response');
            }
        }

        if (!Array.isArray(flashcardsData) || flashcardsData.length === 0) {
            throw new functions.https.HttpsError('internal', 'No flashcards generated');
        }

        // Save to Firestore using batch
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
                // SM-2 initial values
                easeFactor: 2.5,
                interval: 0,
                repetitions: 0,
                nextReview: admin.firestore.Timestamp.now(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastReviewed: null
            });

            createdIds.push(docRef.id);
        });

        await batch.commit();

        return {
            count: flashcardsData.length,
            createdIds
        };

    } catch (error) {
        if (error instanceof functions.https.HttpsError) throw error;
        console.error('Flashcard generation error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate flashcards');
    }
});

/**
 * Review a flashcard — updates SM-2 spaced repetition parameters.
 *
 * SM-2 Algorithm:
 * - quality: 0 (complete blackout) to 5 (perfect response)
 * - EaseFactor: starts at 2.5, minimum 1.3
 * - Interval: days until next review
 */
exports.reviewFlashcard = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { flashcardId, quality } = data;
    const userId = context.auth.uid;

    if (!flashcardId) {
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

    // SM-2 Algorithm Implementation
    let newEaseFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    let newInterval;
    let newRepetitions;

    if (quality < 3) {
        // Incorrect — reset repetitions
        newRepetitions = 0;
        newInterval = 1;
    } else {
        newRepetitions = card.repetitions + 1;

        if (newRepetitions === 1) {
            newInterval = 1;
        } else if (newRepetitions === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(card.interval * newEaseFactor);
        }
    }

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    await cardRef.update({
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitions: newRepetitions,
        difficulty: quality < 3 ? Math.min(5, card.difficulty + 1) : Math.max(0, card.difficulty - 1),
        nextReview: admin.firestore.Timestamp.fromDate(nextReview),
        lastReviewed: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
        nextReview: nextReview.toISOString(),
        interval: newInterval,
        easeFactor: Math.round(newEaseFactor * 100) / 100,
        repetitions: newRepetitions
    };
});
