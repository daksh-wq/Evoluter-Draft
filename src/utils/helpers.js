/**
 * Utility functions and helpers for Evoluter
 */

import { QUESTION_TOPICS, QUESTION_SUBJECTS } from '../constants/data';
import logger from './logger';

/**
 * Generate mock questions for testing/fallback scenarios
 * @param {number} count - Number of questions to generate
 * @param {object} sourceDoc - Optional source document reference
 * @returns {Array} Array of question objects
 */
export const generateMockQuestions = (count, sourceDoc = null) => {
    const questions = [];

    for (let i = 0; i < count; i++) {
        const topic = QUESTION_TOPICS[i % QUESTION_TOPICS.length];
        const subject = QUESTION_SUBJECTS[i % QUESTION_SUBJECTS.length];
        const correctOpt = Math.floor(Math.random() * 4);

        questions.push({
            id: `q-${Date.now()}-${i}`,
            text: `Question ${i + 1} (${topic}): Regarding '${subject}', which analysis holds true in the current context?`,
            options: [
                'It significantly impacts the macro-economic stability indicators.',
                'It has a negligible impact due to recent policy shifts.',
                'It necessitates immediate legislative intervention.',
                'It contradicts core constitutional tenets.',
            ],
            correctAnswer: correctOpt,
            topic: topic,
            tags: [
                { type: 'subject', label: 'General Studies' },
                { type: 'topic', label: topic },
                { type: 'subtopic', label: subject },
                { type: 'concept', label: subject },
                { type: 'difficulty', label: 'Hard' },
                { type: 'bloom', label: 'Analysis' },
                { type: 'type', label: 'Conceptual' }
            ],
            explanation: `Correct Answer: Option ${String.fromCharCode(65 + correctOpt)}. The integration of ${subject} creates a structural impact often overlooked in standard analysis.`,
            masteryStrikes: Math.floor(Math.random() * 3),
            sourceId: sourceDoc?.id,
        });
    }

    return questions;
};

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage rounded to nearest integer
 */
export const calculatePercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
};

/**
 * Get mastery color based on score
 * @param {number} score - Mastery score (0-100)
 * @returns {string} Hex color code
 */
export const getMasteryColor = (score) => {
    if (score > 75) return '#10b981'; // Green
    if (score > 40) return '#f59e0b'; // Yellow/Orange
    return '#ef4444'; // Red
};

/**
 * Delay execution
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
    AUTH: 'evoluter_auth',
    STATS: 'evoluter_stats',
    DOCS: 'evoluter_docs',
};

/**
 * Get item from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Parsed value or default
 */
export const getStorageItem = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
};

/**
 * Set item in localStorage with JSON stringification
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export const setStorageItem = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        logger.error('Error saving to localStorage:', error);
    }
};
