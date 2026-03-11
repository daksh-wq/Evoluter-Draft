import { doc, updateDoc, increment, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_USER_STATS } from '../constants/data';
import { getDefaultSyllabusProgress, calculateSyllabusProgress } from '../constants/syllabusMapping';
import logger from '../utils/logger';

/**
 * Create or initialize a user profile in Firestore
 * @param {string} uid - User ID
 * @param {object} profileData - Initial profile data (e.g. target exam)
 */
export const initializeUserProfile = async (uid, profileData) => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        await setDoc(userRef, {
            ...profileData,
            createdAt: serverTimestamp(),
            stats: DEFAULT_USER_STATS
        });

        // Initialize syllabus progress in a separate document
        const syllabusRef = doc(db, 'users', uid, 'syllabus', 'progress');
        await setDoc(syllabusRef, getDefaultSyllabusProgress());
    }
};

/**
 * Update user stats after a test completion
 * @param {string} uid - User ID
 * @param {object} testResult - Result of the test (score, accuracy, etc.)
 * @param {Array} questions - Array of test questions with answers
 * @param {object} userAnswers - User's answers {questionId: answerIndex}
 */
/**
 * Update user stats after a test completion (Transactional)
 * Prevents race conditions when multiple updates happen simultaneously
 * @param {string} uid - User ID
 * @param {object} testResult - Result of the test (score, accuracy, etc.)
 * @param {Array} questions - Array of test questions with answers
 * @param {object} userAnswers - User's answers {questionId: answerIndex}
 */
export const updateUserStats = async (uid, testResult, questions = [], userAnswers = {}) => {
    const userRef = doc(db, 'users', uid);
    const xpGained = Math.round(testResult.score * 10);

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Read current stats
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User document does not exist!");
            }

            const userData = userDoc.data();
            const currentStats = userData.stats || DEFAULT_USER_STATS;

            // 2. Calculate new values
            const currentXP = currentStats.xp || 0;
            const newTotalXP = currentXP + xpGained;
            const newLevel = Math.floor(newTotalXP / 1000) + 1;
            const topicMastery = calculateTopicMastery(questions, userAnswers, currentStats.topicMastery || {});

            // 3. Write updates
            transaction.update(userRef, {
                'stats.totalQuestionsSolved': increment(testResult.totalQuestions),
                'stats.xp': newTotalXP,
                'stats.level': newLevel,
                'stats.topicMastery': topicMastery,
                'lastActive': serverTimestamp()
            });
        });

        // Update syllabus progress (can remain non-transactional as it's a separate doc)
        if (questions.length > 0) {
            await updateSyllabusProgress(uid, questions, userAnswers);
        }

        return xpGained;
    } catch (error) {
        logger.error("Error updating user stats (transaction):", error);
        return 0;
    }
};

/**
 * Update syllabus progress based on test performance
 * @param {string} uid - User ID
 * @param {Array} questions - Test questions
 * @param {object} userAnswers - User's answers
 */
const updateSyllabusProgress = async (uid, questions, userAnswers) => {
    try {
        const syllabusRef = doc(db, 'users', uid, 'syllabus', 'progress');

        // Get current syllabus progress
        const syllabusSnap = await getDoc(syllabusRef);
        const currentProgress = syllabusSnap.exists() ? syllabusSnap.data() : getDefaultSyllabusProgress();

        // Calculate new progress
        const updatedProgress = calculateSyllabusProgress(questions, userAnswers, currentProgress);

        // Update in Firestore
        await setDoc(syllabusRef, updatedProgress, { merge: true });
    } catch (error) {
        logger.error("Error updating syllabus progress:", error);
        // Don't throw - this is a secondary update
    }
};

/**
 * The 5 canonical UPSC subjects that the Knowledge Graph tracks.
 * All raw AI-generated topic tags are normalized to one of these.
 */
const CANONICAL_TOPICS = ['History', 'Economy', 'Polity', 'Science', 'Geography'];

/**
 * Keyword maps that map raw topic tags → canonical subjects.
 * Short-circuit order matters: more specific keys first.
 */
const TOPIC_KEYWORD_MAP = {
    History: [
        'history', 'ancient', 'medieval', 'modern', 'revolt', 'mughal',
        'vijayanagara', 'harappan', 'indus', 'colonial', 'freedom',
        'gandhi', 'independence', 'british', 'maratha', 'sultanate',
        'advent', 'european', 'social-religious', 'socio', 'reform',
        'nationalism', '1857', 'historical', 'background'
    ],
    Economy: [
        'economy', 'economic', 'fiscal', 'gdp', 'inflation', 'banking',
        'finance', 'budget', 'monetary', 'rbi', 'market', 'planning',
        'balance of payment', 'financial', 'financial markets'
    ],
    Polity: [
        'polity', 'constitution', 'constitutional', 'parliament', 'preamble',
        'fundamental', 'rights', 'directive', 'governor', 'president',
        'prime minister', 'judiciary', 'election', 'federal', 'union',
        'territory', 'amendment', 'article', 'schedule', 'panchayati',
        'municipal', 'local', 'administrative', 'parliamentary', 'system',
        'public policy', 'governance'
    ],
    Science: [
        'science', 'technology', 'biology', 'chemistry', 'physics',
        'space', 'health', 'disease', 'nutrition', 'material', 'energy',
        'nuclear', 'it', 'computer', 'biotech', 'nano', 'defence',
        'innovation', 'research', 'isro', 'ai', 'robots'
    ],
    Geography: [
        'geography', 'geomorphology', 'climate', 'monsoon', 'river',
        'mountain', 'plateau', 'ocean', 'earthquake', 'volcanic',
        'indian geography', 'world geography', 'environment', 'ecology',
        'biodiversity', 'ecosystem', 'pollution', 'food security',
        'sustainable', 'international', 'relations', 'foreign', 'border'
    ],
};

/**
 * Map any raw topic string to one of the 5 canonical UPSC subjects.
 * Falls back to 'General' (which is then ignored in the aggregation).
 */
const normalizeToCanonicalTopic = (rawTopic) => {
    if (!rawTopic) return null;
    const lower = rawTopic.toLowerCase();

    // Check direct match first (case-insensitive)
    const direct = CANONICAL_TOPICS.find(c => c.toLowerCase() === lower);
    if (direct) return direct;

    // Keyword-based mapping
    for (const [canonical, keywords] of Object.entries(TOPIC_KEYWORD_MAP)) {
        if (keywords.some(kw => lower.includes(kw))) {
            return canonical;
        }
    }

    return null; // Unknown topic — skip entirely
};

/**
 * Calculate topic-wise mastery based on test performance.
 * Only tracks the 5 canonical UPSC subjects — all raw AI topic tags
 * are normalized before aggregation so Firestore never grows beyond 5 keys.
 *
 * @param {Array} questions - Test questions
 * @param {object} userAnswers - User's answers
 * @param {object} currentMastery - Current topic mastery scores (from Firestore)
 * @returns {object} Updated mastery scores — always exactly the 5 canonical topics
 */
const calculateTopicMastery = (questions, userAnswers, currentMastery) => {
    // Initialize aggregator for this test session only with canonical topics
    const topicStats = {};

    questions.forEach((question) => {
        // Extract raw topic from question tags or fallback fields
        const topicTag = question.tags?.find(tag => tag.type === 'topic');
        const rawTopic = topicTag?.label || question.topic || null;

        // Normalize to one of the 5 canonical subjects
        const canonical = normalizeToCanonicalTopic(rawTopic);
        if (!canonical) return; // skip unrecognized topics

        if (!topicStats[canonical]) {
            topicStats[canonical] = { correct: 0, total: 0 };
        }
        topicStats[canonical].total += 1;

        const userAnswer = userAnswers[question.id];
        if (userAnswer !== undefined && userAnswer === question.correctAnswer) {
            topicStats[canonical].correct += 1;
        }
    });

    // Start ONLY from canonical topics — drop any stale non-canonical keys
    // that may have accumulated in Firestore from previous behaviour.
    const cleanBaseMastery = {};
    CANONICAL_TOPICS.forEach(c => {
        cleanBaseMastery[c] = currentMastery[c] ?? 0;
    });

    // Apply weighted average: 70% existing, 30% current test performance
    const updatedMastery = { ...cleanBaseMastery };
    Object.entries(topicStats).forEach(([canonical, stats]) => {
        const currentTestAccuracy = (stats.correct / stats.total) * 100;
        updatedMastery[canonical] = Math.round(
            cleanBaseMastery[canonical] * 0.7 + currentTestAccuracy * 0.3
        );
    });

    return updatedMastery;
};

