/**
 * Usage Statistics Cloud Functions
 * SCALE-4: User and admin usage dashboards
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { RATE_LIMITS } = require('./rateLimit');

/**
 * Get usage stats for the current user (rate limit visibility)
 */
exports.getUserUsageStats = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const userId = context.auth.uid;
    const today = new Date().toISOString().split('T')[0];

    const usageDoc = await admin.firestore()
        .collection('users').doc(userId)
        .collection('api_usage').doc(today).get();

    const usage = usageDoc.exists ? usageDoc.data() : {};

    const stats = {};
    for (const [key, limit] of Object.entries(RATE_LIMITS)) {
        const used = usage[key] || 0;
        stats[key] = {
            used,
            limit,
            remaining: Math.max(0, limit - used),
            percentUsed: Math.round((used / limit) * 100)
        };
    }

    return {
        date: today,
        stats,
        resetsAt: `${today}T23:59:59Z`
    };
});

/**
 * Get admin-level aggregate usage stats (admin-only)
 */
exports.getAPIUsageStats = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Verify admin
    const adminDoc = await admin.firestore()
        .collection('admins').doc(context.auth.uid).get();

    if (!adminDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const today = new Date().toISOString().split('T')[0];

    // Aggregate today's usage
    const usersSnapshot = await admin.firestore()
        .collection('users').get();

    let totalTests = 0;
    let totalQuestions = 0;
    let totalFlashcards = 0;
    let totalUsers = 0;
    let activeToday = 0;

    for (const userDoc of usersSnapshot.docs) {
        totalUsers++;
        const usageDoc = await admin.firestore()
            .collection('users').doc(userDoc.id)
            .collection('api_usage').doc(today).get();

        if (usageDoc.exists) {
            const usage = usageDoc.data();
            totalTests += usage.test_generation || 0;
            totalQuestions += usage.question_generation || 0;
            totalFlashcards += usage.flashcard_generation || 0;
            activeToday++;
        }
    }

    return {
        date: today,
        totals: {
            tests: totalTests,
            questions: totalQuestions,
            flashcards: totalFlashcards,
            totalUsers,
            activeToday
        },
        limits: RATE_LIMITS,
        alertLevel: totalTests > 800 ? 'critical' : totalTests > 500 ? 'warning' : 'normal'
    };
});
