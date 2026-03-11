/**
 * Syllabus topic mapping and utilities
 * Maps test topics to syllabus items for automatic progress tracking
 */

import { SYLLABUS_DATA } from './data';

/**
 * Maps question topics to syllabus topic IDs
 * Key: Topic labels from questions
 * Value: Array of syllabus topic IDs that should be updated
 */
export const TOPIC_TO_SYLLABUS_MAP = {
    // History mappings
    'History': ['g1-1', 'g1-2'],
    'Indian History': ['g1-1'],
    'World History': ['g1-2'],
    'Indian Heritage and Culture': ['g1-1'],
    'History of the World': ['g1-2'],
    'Ancient History': ['g1-1'],
    'Medieval History': ['g1-1'],
    'Modern History': ['g1-1', 'g1-2'],

    // Geography mappings
    'Geography': ['g1-3'],
    'World Geography': ['g1-3'],
    'Indian Geography': ['g1-3'],
    'Geography of the World': ['g1-3'],
    'Physical Geography': ['g1-3'],
    'Human Geography': ['g1-3'],

    // Society mappings
    'Society': ['g1-4'],
    'Social Issues': ['g1-4'],
    'Indian Society': ['g1-4'],

    // Polity mappings
    'Polity': ['g2-1', 'g2-2'],
    'Indian Polity': ['g2-1'],
    'Constitution': ['g2-1'],
    'Constitution & Polity': ['g2-1'],
    'Governance': ['g2-2'],
    'Public Administration': ['g2-2'],
    'Fundamental Rights': ['g2-1'],

    // Social Justice mappings
    'Social Justice': ['g2-3'],
    'Welfare Schemes': ['g2-3'],

    // International Relations mappings
    'International Relations': ['g2-4'],
    'Foreign Policy': ['g2-4'],
    'Diplomacy': ['g2-4'],

    // Economy mappings
    'Economy': ['g3-1'],
    'Indian Economy': ['g3-1'],
    'Economics': ['g3-1'],
    'Fiscal Policy': ['g3-1'],
    'Monetary Policy': ['g3-1'],
    'Banking': ['g3-1'],

    // Science & Technology mappings
    'Science': ['g3-2'],
    'Science & Technology': ['g3-2'],
    'Technology': ['g3-2'],
    'Innovation': ['g3-2'],
    'Space': ['g3-2'],
    'Biotechnology': ['g3-2'],

    // Environment mappings
    'Environment': ['g3-3'],
    'Environment & Bio-diversity': ['g3-3'],
    'Climate Change': ['g3-3'],
    'Ecology': ['g3-3'],
    'Biodiversity': ['g3-3'],

    // Disaster Management mappings
    'Disaster Management': ['g3-4'],
    'Disasters': ['g3-4'],
    'Crisis Management': ['g3-4'],
};

/**
 * Get all syllabus topic IDs
 * @returns {Array<string>} Array of all topic IDs
 */
export const getAllSyllabusTopicIds = () => {
    const topicIds = [];
    Object.values(SYLLABUS_DATA).forEach(topics => {
        topics.forEach(topic => topicIds.push(topic.id));
    });
    return topicIds;
};

/**
 * Get syllabus topic IDs for a given question topic
 * @param {string} topic - Topic from question
 * @returns {Array<string>} Array of matching syllabus topic IDs
 */
export const getSyllabusTopicIds = (topic) => {
    if (!topic) return [];

    // Check for exact match first
    if (TOPIC_TO_SYLLABUS_MAP[topic]) {
        return TOPIC_TO_SYLLABUS_MAP[topic];
    }

    // Check for partial match
    const topicLower = topic.toLowerCase();
    for (const [key, value] of Object.entries(TOPIC_TO_SYLLABUS_MAP)) {
        if (key.toLowerCase().includes(topicLower) || topicLower.includes(key.toLowerCase())) {
            return value;
        }
    }

    return [];
};

/**
 * Initialize default syllabus progress for a user
 * @returns {object} Object with all syllabus topics set to 0% completion
 */
export const getDefaultSyllabusProgress = () => {
    const progress = {};
    getAllSyllabusTopicIds().forEach(id => {
        progress[id] = 0;
    });
    return progress;
};

/**
 * Calculate syllabus progress update based on test performance
 * @param {Array} questions - Test questions
 * @param {object} userAnswers - User's answers
 * @param {object} currentProgress - Current syllabus progress
 * @returns {object} Updated syllabus progress
 */
export const calculateSyllabusProgress = (questions, userAnswers, currentProgress = {}) => {
    // Group questions by syllabus topic
    const topicStats = {};

    questions.forEach(question => {
        // Extract topic from question
        const topicTag = question.tags?.find(tag => tag.type === 'topic');
        const questionTopic = topicTag?.label || question.topic;

        if (!questionTopic) return;

        // Get mapped syllabus topic IDs
        const syllabusTopics = getSyllabusTopicIds(questionTopic);

        syllabusTopics.forEach(syllabusTopicId => {
            if (!topicStats[syllabusTopicId]) {
                topicStats[syllabusTopicId] = { correct: 0, total: 0 };
            }

            topicStats[syllabusTopicId].total += 1;

            // Check if answer is correct
            const userAnswer = userAnswers[question.id];
            if (userAnswer !== undefined && userAnswer === question.correctAnswer) {
                topicStats[syllabusTopicId].correct += 1;
            }
        });
    });

    // Calculate new progress with weighted average
    // 80% weight to existing progress, 20% weight to current test
    const updatedProgress = { ...currentProgress };

    Object.entries(topicStats).forEach(([topicId, stats]) => {
        const currentTestAccuracy = (stats.correct / stats.total) * 100;
        const existingProgress = updatedProgress[topicId] || 0;

        // Weighted average: slower progression for syllabus (more conservative)
        updatedProgress[topicId] = Math.round(
            existingProgress * 0.8 + currentTestAccuracy * 0.2
        );

        // Ensure progress doesn't exceed 100%
        updatedProgress[topicId] = Math.min(100, updatedProgress[topicId]);
    });

    return updatedProgress;
};
