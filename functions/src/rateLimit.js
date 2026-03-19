/**
 * Rate Limiting Module
 * Firestore-based per-user daily rate limiting
 */
const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Default rate limits per operation type
 */
const RATE_LIMITS = {
    test_generation: 10,       // 10 AI tests per day
    question_generation: 50,   // 50 question batches per day
    ai_evaluation: 20,         // 20 mains evaluations per day
    flashcard_generation: 15,  // 15 flashcard sets per day
    pdf_extraction: 10,        // 10 PDF extractions per day
};

/**
 * Check and increment rate limit for a user
 * @param {string} userId - Firebase Auth UID
 * @param {string} limitType - Type of operation to rate limit
 * @throws {functions.https.HttpsError} If rate limit exceeded
 */
async function checkAndIncrementRateLimit(userId, limitType = 'test_generation') {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const usageRef = admin.firestore()
        .collection('users').doc(userId)
        .collection('api_usage').doc(today);

    const maxLimit = RATE_LIMITS[limitType] || 10;

    // Read current usage (no transaction needed)
    const usageDoc = await usageRef.get();
    const currentCount = usageDoc.exists ? (usageDoc.data()[limitType] || 0) : 0;

    if (currentCount >= maxLimit) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            `Daily limit reached (${maxLimit}/${limitType}). Try again tomorrow.`
        );
    }

    // Atomic increment — no transaction overhead
    await usageRef.set(
        {
            [limitType]: admin.firestore.FieldValue.increment(1),
            date: today,
            lastUsed: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
    );
}

module.exports = {
    checkAndIncrementRateLimit,
    RATE_LIMITS,
};
