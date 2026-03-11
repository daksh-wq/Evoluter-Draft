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
 * Calculate topic-wise mastery based on test performance
 * @param {Array} questions - Test questions
 * @param {object} userAnswers - User's answers
 * @param {object} currentMastery - Current topic mastery scores
 * @returns {object} Updated mastery scores
 */
const calculateTopicMastery = (questions, userAnswers, currentMastery) => {
    // Group questions by topic
    const topicStats = {};

    questions.forEach((question) => {
        // Extract topic from question tags
        const topicTag = question.tags?.find(tag => tag.type === 'topic');
        const topic = topicTag?.label || question.topic || 'General';

        if (!topicStats[topic]) {
            topicStats[topic] = { correct: 0, total: 0 };
        }

        topicStats[topic].total += 1;

        // Check if answer is correct
        const userAnswer = userAnswers[question.id];
        if (userAnswer !== undefined && userAnswer === question.correctAnswer) {
            topicStats[topic].correct += 1;
        }
    });

    // Calculate new mastery scores with weighted average
    // 70% weight to existing mastery, 30% weight to current test performance
    const updatedMastery = { ...currentMastery };

    Object.entries(topicStats).forEach(([topic, stats]) => {
        const currentTestAccuracy = (stats.correct / stats.total) * 100;
        const existingMastery = updatedMastery[topic] || 0;

        // Weighted average: smooth progression over time
        updatedMastery[topic] = Math.round(
            existingMastery * 0.7 + currentTestAccuracy * 0.3
        );
    });

    return updatedMastery;
};

