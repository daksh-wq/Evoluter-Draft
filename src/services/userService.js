import { doc, updateDoc, increment, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_USER_STATS } from '../constants/data';
import { getDefaultSyllabusProgress, calculateSyllabusProgress } from '../constants/syllabusMapping';
import logger from '../utils/logger';

/**
 * Lookup: AI tag codes → human-readable subtopic names.
 * Mirrors TAGGING_INSTRUCTION in functions/src/utils/promptHelpers.js exactly.
 * Used to decode q.subjectCode + q.topicCode from AI-generated questions.
 */
const TOPIC_CODE_NAMES = {
    'PC': { '01': 'Constitutional Framework', '02': 'Rights & Duties', '03': 'Union & State Executive', '04': 'Union & State Legislature', '05': 'Judiciary', '06': 'Local Government', '07': 'Federalism & Relations', '08': 'Bodies & Provisions' },
    'IE': { '01': 'National Income & Accounting', '02': 'Fiscal Policy & Budgeting', '03': 'Monetary Policy & Banking', '04': 'External Sector', '05': 'Financial Markets', '06': 'Social Sector & Poverty', '07': 'Sectors of Economy', '08': 'International Organizations' },
    'GE': { '01': 'Geomorphology', '02': 'Climatology', '03': 'Oceanography & Hydrology', '04': 'Human Geography', '05': 'Indian Physical Geography', '06': 'Biogeography', '07': 'Economic Geography', '08': 'Mapping' },
    'ST': { '01': 'Space Technology & Astronomy', '02': 'Biotechnology & Health', '03': 'IT, Computing & Electronics', '04': 'General Science – Physics, Chemistry, Biology', '05': 'Defense Technology' },
    'IR': { '01': 'Bilateral Relations', '02': 'Global Groupings', '03': 'Global Institutions' },
    'AC': { '01': 'Indian Architecture', '02': 'Sculptures of India', '03': 'Indian Paintings', '04': 'Indian Music and Dance Forms', '05': 'Theatres, Puppetry, Calendars, Fairs & Festivals', '06': 'Literary Arts & Philosophy' },
    'EN': { '01': 'Ecology Basics & Ecosystems', '02': 'Ecosystem Functions', '03': 'Terrestrial & Aquatic Biomes', '04': 'Biodiversity & Species', '05': 'Protected Area Network (PAN)', '06': 'Climate Change & Mitigation', '07': 'Pollution & Waste Management', '08': 'Environmental Governance & Acts' },
    'AH': { '01': 'Pre-Historic & Indus Valley Civilization', '02': 'Vedic Culture & Religious Movements', '03': 'The Mauryan Empire', '04': 'Post-Mauryan & Sangam Age', '05': 'Gupta & Post-Gupta Era', '06': 'South Indian Kingdoms', '07': 'Ancient Art & Culture' },
    'MH': { '01': 'Early Medieval India', '02': 'Rajput Era & Early Invasions', '03': 'Delhi Sultanate', '04': 'Bhakti & Sufi Movements', '05': 'Vijayanagar & Bahmani Empires', '06': 'Mughal Empire', '07': 'Maratha Empire', '08': 'Medieval Art & Architecture' },
    'MO': { '01': 'Expansion of British Power', '02': 'British Policies & Admin', '03': 'Early Resistance & 1857', '04': 'Socio-Religious Reforms', '05': 'Early National Movement', '06': 'Gandhian Era & Mass Movements', '07': 'Constitutional Evolution', '08': 'Independence & Beyond' },
};

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
 * The canonical subjects that the Knowledge Graph tracks.
 * Must match SUBJECTS in appConstants.js (excluding 'All Subjects').
 */
const CANONICAL_TOPICS = [
    'Polity & Constitution',
    'Indian Economy',
    'Geography',
    'Science & Technology',
    'International Relations',
    'Art & Culture',
    'Environment',
    'Ancient & Medieval History',
    'Modern History'
];

/**
 * Keyword maps that map raw topic tags → canonical subjects.
 * Short-circuit order matters: more specific keys first.
 */
const TOPIC_KEYWORD_MAP = {
    'Polity & Constitution': [
        'polity', 'indian polity', 'constitution', 'constitutional', 'parliament', 'preamble',
        'fundamental', 'rights', 'directive', 'governor', 'president',
        'prime minister', 'judiciary', 'election', 'federal', 'union',
        'territory', 'amendment', 'article', 'schedule', 'panchayati',
        'municipal', 'local governance', 'parliamentary', 'governance'
    ],
    'Ancient & Medieval History': [
        'ancient', 'medieval', 'harappan', 'indus', 'vedic', 'mughal', 'sultanate',
        'vijayanagara', 'mauryan', 'gupta', 'chola', 'rajput', 'maratha',
        'bhakti', 'sufi', 'delhi sultanate', 'bahmani', 'ancient history', 'medieval history'
    ],
    'Modern History': [
        'modern', 'modern history', 'revolt', 'colonial', 'freedom', 'gandhi',
        'independence', 'british', '1857', 'nationalism', 'socio-religious reform',
        'congress', 'non-cooperation', 'civil disobedience', 'quit india'
    ],
    'Art & Culture': [
        'art and culture', 'art & culture', 'culture', 'art', 'architecture', 'heritage',
        'dance', 'music', 'painting', 'literature', 'religion', 'philosophy', 'indian culture',
        'temple', 'sculpture', 'folk', 'classical'
    ],
    'Geography': [
        'geography', 'geomorphology', 'climate', 'monsoon', 'river',
        'mountain', 'plateau', 'ocean', 'earthquake', 'volcanic',
        'indian geography', 'world geography', 'mapping', 'soil', 'tides'
    ],
    'Indian Economy': [
        'economy', 'economy of india', 'indian economy', 'economic', 'fiscal', 'gdp',
        'inflation', 'banking', 'finance', 'budget', 'monetary', 'rbi', 'market',
        'planning', 'balance of payment', 'financial', 'gst', 'tax', 'trade'
    ],
    'Environment': [
        'environment', 'ecology', 'biodiversity', 'ecosystem', 'pollution',
        'food security', 'sustainable', 'climate change', 'conservation', 'wildlife',
        'national park', 'wetland', 'biosphere', 'tiger reserve'
    ],
    'Science & Technology': [
        'science and technology', 'science & technology', 'science', 'technology',
        'biology', 'chemistry', 'physics', 'space', 'health', 'disease', 'nutrition',
        'material', 'energy', 'nuclear', 'it', 'computer', 'biotech', 'nano',
        'defence', 'innovation', 'research', 'isro', 'ai', 'robots'
    ],
    'International Relations': [
        'international relations', 'bilateral', 'foreign policy', 'diplomatic',
        'united nations', 'un', 'nato', 'g20', 'brics', 'saarc', 'asean',
        'global groupings', 'global institutions', 'treaty', 'summit', 'world bank', 'imf'
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
        // Priority 1: decode AI tag codes (subjectCode + topicCode → e.g. "Rights & Duties")
        //   This is the primary source for AI-generated questions since they carry codes not tags.
        // Priority 2: explicit topic/subtopic tag in q.tags
        // Priority 3: q.subtopic field
        // Priority 4: q.topic field only if it differs from canonical (avoids same-as-subject noise)
        // Priority 5: raw subject label if more specific than canonical
        // No generic 'Core Concepts' fallback — if nothing meaningful, skip subtopic only.
        let specificTopicTag =
            (q.subjectCode && q.topicCode ? TOPIC_CODE_NAMES[q.subjectCode]?.[q.topicCode] : null) ||
            q.tags?.find(t => t.type === 'topic' || t.type === 'subtopic')?.label ||
            q.subtopic ||
            null;

        if (!specificTopicTag) {
            // q.topic is often the test topic itself (same as canonical) — only use if it differs
            const rawTopic = q.topic?.trim();
            if (rawTopic && rawTopic.toLowerCase() !== canonical.toLowerCase()) {
                specificTopicTag = rawTopic;
            }
        }

        if (!specificTopicTag) {
            // Last resort: raw subject label (e.g. "Indian Geography" vs canonical "Geography")
            const rawLabel = topicTag?.trim();
            specificTopicTag = (rawLabel && rawLabel.toLowerCase() !== canonical.toLowerCase())
                ? rawLabel
                : null;
        }

        // Only write subtopic if we have a meaningful tag (does NOT early-return — Resources/Types still count below)
        if (specificTopicTag) {
            if (!perf.subjects[canonical].subtopics[specificTopicTag]) {
                perf.subjects[canonical].subtopics[specificTopicTag] = { total: 0, attempted: 0, correct: 0 };
            }
            perf.subjects[canonical].subtopics[specificTopicTag].total += 1;
            if (isAttempted) perf.subjects[canonical].subtopics[specificTopicTag].attempted += 1;
            if (isCorrect) perf.subjects[canonical].subtopics[specificTopicTag].correct += 1;
        }

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
        // Extract raw topic from question tags — check subject, topic, and subtopic tags
        const subjectTag = question.tags?.find(tag => tag.type === 'subject');
        const topicTag = question.tags?.find(tag => tag.type === 'topic' || tag.type === 'subtopic');
        const rawTopic = subjectTag?.label || topicTag?.label || question.subject || question.topic || null;

        // Normalize to one of the canonical subjects
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
        // Plain read — no transaction lock, so concurrent Cloud Function / onSnapshot
        // writes won't cause a failed-precondition error.
        const userDoc = await getDoc(userRef);
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
            }
            // diffDays === 0: already logged in today — no change needed
            else {
                return; // streak already up-to-date for today, skip write
            }
        }

        // Simple updateDoc — no precondition, safe to race with Cloud Function writes
        await updateDoc(userRef, {
            'stats.streakDays': newStreak,
            'lastActive': serverTimestamp()
        });
    } catch (error) {
        logger.error("Error syncing user streak:", error);
    }
};
