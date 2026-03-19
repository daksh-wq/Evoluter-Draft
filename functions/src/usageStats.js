/**
 * Usage Statistics Cloud Functions
 * SCALE-4: User and admin usage dashboards
 *
 * Production hardening:
 * - runWith() on all functions
 * - CRIT-1 FIX: Replaced full collection scan with collectionGroup query
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { RATE_LIMITS } = require('./rateLimit');

/**
 * Get usage stats for the current user (rate limit visibility)
 */
exports.getUserUsageStats = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30 })
    .https.onCall(async (data, context) => {
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
                percentUsed: Math.round((used / limit) * 100),
            };
        }

        return { date: today, stats, resetsAt: `${today}T23:59:59Z` };
    });

/**
 * Get admin-level aggregate usage stats.
 *
 * CRIT-1 FIX: Uses collectionGroup('api_usage') filtered by today's date
 * instead of scanning the entire 'users' collection + N subcollection reads.
 * Requires a Firestore index on collection group 'api_usage' with field 'date'.
 */
exports.getAPIUsageStats = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const adminDoc = await admin.firestore()
            .collection('admins').doc(context.auth.uid).get();

        if (!adminDoc.exists) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }

        const today = new Date().toISOString().split('T')[0];

        // collectionGroup query — only reads docs that exist for today
        const usageSnapshot = await admin.firestore()
            .collectionGroup('api_usage')
            .where('date', '==', today)
            .get();

        let totalTests = 0, totalQuestions = 0, totalFlashcards = 0, activeToday = 0;

        usageSnapshot.docs.forEach(doc => {
            const usage = doc.data();
            totalTests += usage.test_generation || 0;
            totalQuestions += usage.question_generation || 0;
            totalFlashcards += usage.flashcard_generation || 0;
            activeToday++;
        });

        // Lightweight user count
        let totalUsers = 0;
        try {
            const countSnap = await admin.firestore().collection('users').count().get();
            totalUsers = countSnap.data().count;
        } catch {
            const usersSnap = await admin.firestore().collection('users').select().get();
            totalUsers = usersSnap.size;
        }

        return {
            date: today,
            totals: { tests: totalTests, questions: totalQuestions, flashcards: totalFlashcards, totalUsers, activeToday },
            limits: RATE_LIMITS,
            alertLevel: totalTests > 800 ? 'critical' : totalTests > 500 ? 'warning' : 'normal',
        };
    });
