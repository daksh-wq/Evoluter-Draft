/**
 * Gemini AI Service — Client Proxy Layer (SEC-1 Fix)
 *
 * All AI calls are now routed through Cloud Functions.
 * The Gemini API key is stored server-side ONLY.
 * This file keeps the exact same exported function signatures so all
 * callers (Dashboard, TestCreator, ResultView, etc.) require zero changes.
 *
 * Local cache reads (cached_tests) are preserved — they are Firestore reads,
 * not AI calls, so they remain client-side and save unnecessary CF invocations.
 */

import { functions, db } from './firebase';
import { httpsCallable } from 'firebase/functions';
import {
    collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp
} from 'firebase/firestore';
import logger from '../utils/logger';

// ─── Timeout config ───────────────────────────────────────────────────────────
const LONG_TIMEOUT  = { timeout: 540_000 }; // 9 min — question generation
const MED_TIMEOUT   = { timeout: 180_000 }; // 3 min — analysis / evaluation
const SHORT_TIMEOUT = { timeout:  30_000 }; // 30 s  — suggestions / news

// ─── Progress Simulation Helpers ─────────────────────────────────────────────
/**
 * Returns a cancel function. Fires onProgress from `start` to `stall` over
 * `durationMs`, stalling just below 100% until the caller cancels.
 */
function simulateProgress(onProgress, start = 5, stall = 92, durationMs = 15_000) {
    if (typeof onProgress !== 'function') return () => {};
    const step = (stall - start) / (durationMs / 200);
    let current = start;
    onProgress(current);
    const id = setInterval(() => {
        current = Math.min(current + step, stall);
        onProgress(Math.round(current));
    }, 200);
    return () => clearInterval(id);
}

// ─── 1. generateQuestions ─────────────────────────────────────────────────────
/**
 * Generate MCQ questions on a specific topic.
 * Checks local cache first; falls back to Cloud Function AI generation.
 *
 * @param {string}   topic
 * @param {number}   count
 * @param {string}   difficulty
 * @param {string}   targetExam
 * @param {Function} onProgress  - optional progress callback (0-100)
 * @param {string[]} existingQuestions - text of already-seen questions to avoid
 * @returns {Promise<Array>}
 */
export async function generateQuestions(
    topic,
    count = 5,
    difficulty = 'Hard',
    targetExam = 'UPSC CSE',
    onProgress = () => {},
    existingQuestions = []
) {
    // ── Cache check (Firestore read — stays client-side) ──────────────────────
    if (count <= 25) {
        try {
            const cacheRef = collection(db, 'cached_tests');
            const q = query(
                cacheRef,
                where('topic', '==', topic),
                where('difficulty', '==', difficulty),
                where('questionCount', '>=', count),
                orderBy('questionCount', 'desc'),
                limit(5)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const docs = snapshot.docs;
                const randomDoc = docs[Math.floor(Math.random() * docs.length)];
                const cachedTest = randomDoc.data();
                logger.info(`Serving cached test for topic: ${topic}`);
                onProgress(100);
                const shuffled = [...cachedTest.questions].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, count);
            }
        } catch (err) {
            logger.warn('Cache check failed, proceeding to CF:', err);
        }
    }

    // ── Cloud Function call ───────────────────────────────────────────────────
    const stop = simulateProgress(onProgress, 10, 92, 20_000);
    try {
        const fn = httpsCallable(functions, 'geminiGenerateQuestions', LONG_TIMEOUT);
        const result = await fn({ topic, count, difficulty, targetExam, existingQuestions });
        stop();
        onProgress(100);
        return result.data?.questions || [];
    } catch (error) {
        stop();
        logger.error('generateQuestions CF error:', error);
        throw error;
    }
}

// ─── 2. generateQuestionsFromDocument ────────────────────────────────────────
/**
 * Generate questions from extracted document/PDF text.
 * Mirrors the old signature exactly.
 *
 * @param {string}   documentText
 * @param {string}   documentTitle
 * @param {number}   count
 * @param {string}   difficulty
 * @param {Function} onProgress
 * @param {string[]} existingQuestions
 * @returns {Promise<Array>}
 */
export async function generateQuestionsFromDocument(
    documentText,
    documentTitle = 'Document',
    count = 10,
    difficulty = 'Hard',
    onProgress = () => {},
    existingQuestions = []
) {
    const stop = simulateProgress(onProgress, 5, 92, 30_000);
    try {
        const fn = httpsCallable(functions, 'geminiGenerateFromDocument', LONG_TIMEOUT);
        const result = await fn({ documentText, documentTitle, count, difficulty, existingQuestions });
        stop();
        onProgress(100);
        return result.data?.questions || [];
    } catch (error) {
        stop();
        logger.error('generateQuestionsFromDocument CF error:', error);
        throw error;
    }
}

// ─── 3. evaluateAnswer ───────────────────────────────────────────────────────
/**
 * Evaluate a Mains answer using AI.
 * @param {string} answerText
 * @returns {Promise<object>}
 */
export async function evaluateAnswer(answerText) {
    try {
        const fn = httpsCallable(functions, 'geminiEvaluateAnswer', MED_TIMEOUT);
        const result = await fn({ answerText });
        return result.data || {
            score: '6.5', keywords: ['Structure'], missing: ['Depth'],
            feedback: 'Good attempt. Add more specific examples.',
        };
    } catch (error) {
        logger.error('evaluateAnswer CF error:', error);
        return {
            score: '6.0', keywords: ['Basics'], missing: ['Depth'],
            feedback: 'Evaluation error. Please try again.',
        };
    }
}

// ─── 4. analyzeTestPerformance ────────────────────────────────────────────────
/**
 * Analyze test performance using AI.
 * @param {Array}  questions
 * @param {object} answers  - { [questionId]: selectedOptionIndex }
 * @returns {Promise<object>}
 */
export async function analyzeTestPerformance(questions, answers) {
    try {
        const fn = httpsCallable(functions, 'geminiAnalyzePerformance', MED_TIMEOUT);
        const result = await fn({ questions, answers });
        return result.data || {
            overallFeedback: 'AI analysis unavailable. Please review your answers.',
            personalizedFeedback: [], topicsToStudy: [], keyStrengths: [],
            focusOn: ['Review your incorrect answers'],
            strengths: ['Attempting the test'],
        };
    } catch (error) {
        logger.error('analyzeTestPerformance CF error:', error);
        return {
            overallFeedback: 'AI analysis unavailable. Please review your answers.',
            personalizedFeedback: [], topicsToStudy: [], keyStrengths: [],
            focusOn: ['Review your incorrect answers'],
            strengths: ['Attempting the test'],
        };
    }
}

// ─── 5. suggestTestTopics ─────────────────────────────────────────────────────
/**
 * Get AI-powered topic autocomplete suggestions.
 * @param {string} keyword
 * @param {string} targetExam
 * @param {AbortSignal} signal  - kept for API compat, not used (CF handles timeout)
 * @returns {Promise<string[]>}
 */
export async function suggestTestTopics(keyword, targetExam = 'UPSC CSE', signal = null) {
    if (!keyword || keyword.trim().length < 2) return [];
    try {
        const fn = httpsCallable(functions, 'geminiSuggestTopics', SHORT_TIMEOUT);
        const result = await fn({ keyword, targetExam });
        return result.data?.suggestions || [];
    } catch (error) {
        if (error.name === 'AbortError') return [];
        logger.error('suggestTestTopics CF error:', error);
        return [];
    }
}

// ─── 6. generateNews ─────────────────────────────────────────────────────────
/**
 * Generate a current affairs news feed for UPSC.
 * @returns {Promise<Array>}
 */
export async function generateNews() {
    try {
        const fn = httpsCallable(functions, 'geminiGenerateNews', SHORT_TIMEOUT);
        const result = await fn({});
        return result.data?.news || [];
    } catch (error) {
        logger.error('generateNews CF error:', error);
        return [];
    }
}

// ─── 7. isGeminiConfigured ───────────────────────────────────────────────────
/**
 * Always returns true — configuration is now validated server-side.
 * Kept for backward compat with any UI guard that checks this.
 */
export function isGeminiConfigured() {
    return true;
}

/**
 * Legacy direct Gemini call now routed through geminiChat for general assistant logic.
 * @param {string} prompt
 * @param {boolean} isJson - now ignored as geminiChat is text-first (use generateQuestions for JSON)
 * @param {string} model - pass specific model name (e.g. gemini-1.5-pro)
 * @returns {Promise<string>}
 */
export async function callGemini(prompt, isJson = false, model = 'gemini-2.5-flash') {
    try {
        const fn = httpsCallable(functions, 'geminiChat', SHORT_TIMEOUT);
        const result = await fn({ prompt, model });
        return result.data?.text || null;
    } catch (error) {
        logger.error('callGemini (Chat) CF error:', error);
        return null;
    }
}
