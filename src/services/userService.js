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
            const performance = calculatePerformanceMetrics(questions, userAnswers, currentStats.performance || {});

            // 3. Write updates
            transaction.update(userRef, {
                'stats.totalQuestionsSolved': increment(testResult.totalQuestions),
                'stats.xp': newTotalXP,
                'stats.level': newLevel,
                'stats.topicMastery': topicMastery,
                'stats.performance': performance,
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
 * The 10 canonical UPSC subjects that the Knowledge Graph tracks.
 * All raw AI-generated topic tags are normalized to one of these.
 */
const CANONICAL_TOPICS = [
    'Indian Polity',
    'Ancient and Medieval History',
    'Modern India',
    'Indian Culture',
    'Geography',
    'Economy of India',
    'Environment',
    'Science and Technology',
    'Current Affairs',
    'Trivial'
];

/**
 * Keyword maps that map raw topic tags → canonical subjects.
 * Short-circuit order matters: more specific keys first.
 */
const TOPIC_KEYWORD_MAP = {
    'Indian Polity': [
        'polity', 'constitution', 'constitutional', 'parliament', 'preamble',
        'fundamental', 'rights', 'directive', 'governor', 'president',
        'prime minister', 'judiciary', 'election', 'federal', 'union',
        'territory', 'amendment', 'article', 'schedule', 'panchayati',
        'municipal', 'local', 'administrative', 'parliamentary', 'system',
        'public policy', 'governance'
    ],
    'Ancient and Medieval History': [
        'ancient', 'medieval', 'harappan', 'indus', 'mughal', 'sultanate', 'vijayanagara', 'mauryan', 'gupta', 'chola'
    ],
    'Modern India': [
        'modern', 'revolt', 'colonial', 'freedom', 'gandhi', 'independence', 'british', 'maratha', '1857', 'nationalism', 'history'
    ],
    'Indian Culture': [
        'culture', 'art', 'architecture', 'heritage', 'dance', 'music', 'painting', 'literature', 'religion', 'philosophy'
    ],
    'Geography': [
        'geography', 'geomorphology', 'climate', 'monsoon', 'river',
        'mountain', 'plateau', 'ocean', 'earthquake', 'volcanic',
        'indian geography', 'world geography'
    ],
    'Economy of India': [
        'economy', 'economic', 'fiscal', 'gdp', 'inflation', 'banking',
        'finance', 'budget', 'monetary', 'rbi', 'market', 'planning',
        'balance of payment', 'financial'
    ],
    'Environment': [
        'environment', 'ecology', 'biodiversity', 'ecosystem', 'pollution', 'food security', 'sustainable', 'climate change', 'conservation', 'wildlife'
    ],
    'Science and Technology': [
        'science', 'technology', 'biology', 'chemistry', 'physics',
        'space', 'health', 'disease', 'nutrition', 'material', 'energy',
        'nuclear', 'it', 'computer', 'biotech', 'nano', 'defence',
        'innovation', 'research', 'isro', 'ai', 'robots'
    ],
    'Current Affairs': [
        'current', 'affairs', 'international', 'relations', 'foreign', 'border', 'news', 'recent'
    ],
    'Trivial': [
        'trivia', 'general', 'miscellaneous', 'other'
    ]
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
 * Smartly parse questions and answers to extract E-M-D, Subject, Resource, and Type analytics.
 */
const calculatePerformanceMetrics = (questions, userAnswers, currentPerf) => {
    // Boilerplate defaults
    const perf = {
        emd: currentPerf.emd || {
            Easy: { total: 0, attempted: 0, correct: 0 },
            Medium: { total: 0, attempted: 0, correct: 0 },
            Difficult: { total: 0, attempted: 0, correct: 0 }
        },
        subjects: currentPerf.subjects || {},
        resources: currentPerf.resources || {
            'NCERT (Fundamental)': { total: 0, attempted: 0, correct: 0 },
            'Standard Books': { total: 0, attempted: 0, correct: 0 },
            'Advanced Sources': { total: 0, attempted: 0, correct: 0 }
        },
        questionTypes: currentPerf.questionTypes || {
            'One-liner': { total: 0, attempted: 0, correct: 0 },
            'Statement (How many)': { total: 0, attempted: 0, correct: 0 },
            'Statement (Which of)': { total: 0, attempted: 0, correct: 0 },
            'Match the pairs': { total: 0, attempted: 0, correct: 0 },
            'Assertion-Reason': { total: 0, attempted: 0, correct: 0 }
        }
    };

    questions.forEach(q => {
        const isAttempted = userAnswers[q.id] !== undefined;
        const isCorrect = isAttempted && userAnswers[q.id] === q.correctAnswer;

        // --- 1. E-M-D ---
        let diff = q.difficulty || 'Medium';
        if (diff === 'Intermediate') diff = 'Medium';
        if (diff === 'Hard') diff = 'Difficult';
        if (!perf.emd[diff]) diff = 'Medium'; // safe fallback
        
        perf.emd[diff].total += 1;
        if (isAttempted) perf.emd[diff].attempted += 1;
        if (isCorrect) perf.emd[diff].correct += 1;

        // --- 2. Subjects ---
        const topicTag = q.tags?.find(t => t.type === 'subject')?.label || q.subject || q.topic;
        const canonical = normalizeToCanonicalTopic(topicTag) || 'General';
        
        if (!perf.subjects[canonical]) {
            perf.subjects[canonical] = { total: 0, attempted: 0, correct: 0, subtopics: {} };
        }
        if (!perf.subjects[canonical].subtopics) {
            perf.subjects[canonical].subtopics = {};
        }

        perf.subjects[canonical].total += 1;
        if (isAttempted) perf.subjects[canonical].attempted += 1;
        if (isCorrect) perf.subjects[canonical].correct += 1;

        // --- SUBTOPICS ---
        // Try to find a more specific topic or subtopic
        let specificTopicTag = q.tags?.find(t => t.type === 'topic' || t.type === 'subtopic')?.label || q.topic || q.subtopic;
        if (!specificTopicTag || specificTopicTag === canonical) {
            specificTopicTag = 'Core Concepts'; 
        }
        
        if (!perf.subjects[canonical].subtopics[specificTopicTag]) {
            perf.subjects[canonical].subtopics[specificTopicTag] = { total: 0, attempted: 0, correct: 0 };
        }
        perf.subjects[canonical].subtopics[specificTopicTag].total += 1;
        if (isAttempted) perf.subjects[canonical].subtopics[specificTopicTag].attempted += 1;
        if (isCorrect) perf.subjects[canonical].subtopics[specificTopicTag].correct += 1;

        // --- 3. Resources --- // Smart infer strategy since exact DB tagging might not exist natively
        let resource = 'Standard Books';
        const qText = (q.text || '').toLowerCase();
        if (q.resource === 'NCERT' || qText.includes('ncert') || diff === 'Easy') resource = 'NCERT (Fundamental)';
        else if (q.resource === 'Advanced' || diff === 'Difficult' || canonical === 'Current Affairs') resource = 'Advanced Sources';
        
        perf.resources[resource].total += 1;
        if (isAttempted) perf.resources[resource].attempted += 1;
        if (isCorrect) perf.resources[resource].correct += 1;

        // --- 4. Question Types --- // Smart regex mapping
        let qType = 'One-liner';
        if (qText.includes('how many of the above') || qText.includes('how many of the given')) qType = 'Statement (How many)';
        else if (qText.includes('which of the following statement') || qText.includes('which of the above statement') || /1\s*(and|only|&)/i.test(qText)) qType = 'Statement (Which of)';
        else if (qText.includes('match the following') || qText.includes('correctly matched') || qText.includes('list i') || qText.includes('list ii')) qType = 'Match the pairs';
        else if (qText.includes('assertion') && qText.includes('reason')) qType = 'Assertion-Reason';
        
        if (!perf.questionTypes[qType]) qType = 'One-liner'; 
        perf.questionTypes[qType].total += 1;
        if (isAttempted) perf.questionTypes[qType].attempted += 1;
        if (isCorrect) perf.questionTypes[qType].correct += 1;
    });

    return perf;
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

/**
 * Sync and update user streak based on last active timestamp
 * @param {string} uid - User ID
 */
export const syncUserStreak = async (uid) => {
    const userRef = doc(db, 'users', uid);
    
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) return;

            const userData = userDoc.data();
            const stats = userData.stats || { ...DEFAULT_USER_STATS };
            const lastActive = userData.lastActive?.toDate();
            const now = new Date();
            
            // Normalize dates to midnight for comparison
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            let newStreak = stats.streakDays || 0;
            
            if (!lastActive) {
                // First time activity
                newStreak = 1;
            } else {
                const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
                const diffTime = today - lastActiveDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    // Logged in exactly the next day
                    newStreak += 1;
                } else if (diffDays > 1) {
                    // Missed one or more days, reset streak
                    newStreak = 1;
                } else if (diffDays === 0) {
                    // Already logged in today, do nothing to streak
                }
            }

            transaction.update(userRef, {
                'stats.streakDays': newStreak,
                'lastActive': serverTimestamp()
            });
        });
    } catch (error) {
        logger.error("Error syncing user streak:", error);
    }
};
