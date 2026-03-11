import { serverTimestamp } from 'firebase/firestore';

/**
 * Constants for UPSC Scoring
 */
export const SCORING = {
    CORRECT: 2,
    INCORRECT: 0.66,
    UNANSWERED: 0
};

/**
 * Calculate test results based on user answers
 * @param {Array} test - Array of question objects
 * @param {object} currentAnswers - Map of questionId -> selectedOptionIndex
 * @param {number} currentTimeLeft - Remaining time in seconds
 * @param {number} currentTotalDuration - Total duration in seconds
 * @returns {object|null} Calculated results or null if invalid input
 */
export const calculateResults = (test, currentAnswers, currentTimeLeft, currentTotalDuration) => {
    if (!test || !Array.isArray(test) || test.length === 0) return null;

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    test.forEach((question) => {
        const userAnswer = currentAnswers[question.id];
        if (userAnswer === undefined) {
            unanswered++;
        } else if (userAnswer === question.correctAnswer) {
            correct++;
        } else {
            incorrect++;
        }
    });

    // UPSC-style scoring calculation
    let rawScore = (correct * SCORING.CORRECT) - (incorrect * SCORING.INCORRECT);
    rawScore = Math.max(0, parseFloat(rawScore.toFixed(2)));

    const totalQuestions = test.length;
    const accuracy = totalQuestions > 0
        ? parseFloat(((correct / totalQuestions) * 100).toFixed(2))
        : 0;

    const timeTaken = currentTotalDuration - currentTimeLeft;

    return {
        totalQuestions,
        correct,
        incorrect,
        unanswered,
        score: rawScore,
        accuracy,
        completionTime: timeTaken,
        timeTaken,
        timestamp: serverTimestamp() // Note: This is an SDK object, but okay for a util helper intended for FB
    };
};

/**
 * Optimize questions for storage (remove unnecessary fields for history)
 * @param {Array} questions - Full question objects
 * @param {object} answers - User answers
 * @returns {Array} Optimized questions for storage
 */
export const optimizeQuestionsForStorage = (questions, answers) => {
    return questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        userAnswer: answers[q.id],
        correctAnswer: q.correctAnswer,
        topic: q.topic,
        explanation: q.explanation,
        difficulty: q.difficulty || 'Medium',
        tags: q.tags || []
    }));
};
