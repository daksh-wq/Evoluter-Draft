/**
 * Scheduled Cleanup Cloud Function
 * Purges expired data to control storage costs and query performance.
 *
 * Runs daily via Cloud Scheduler (or can be triggered manually).
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

/** Delete docs in batches to avoid memory/timeout issues */
async function deleteInBatches(query, batchSize = 100) {
    let totalDeleted = 0;
    let snapshot = await query.limit(batchSize).get();

    while (!snapshot.empty) {
        const batch = admin.firestore().batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += snapshot.size;

        if (snapshot.size < batchSize) break;
        snapshot = await query.limit(batchSize).get();
    }

    return totalDeleted;
}

/**
 * cleanupExpiredData — runs daily at 3:00 AM UTC
 *
 * 1. Deletes `_test_questions` docs older than 24 hours (abandoned tests)
 * 2. Deletes `cached_tests` docs older than 7 days
 */
exports.cleanupExpiredData = functions
    .runWith({ memory: '256MB', timeoutSeconds: 120 })
    .pubsub.schedule('0 3 * * *')   // Every day at 3:00 AM UTC
    .timeZone('Asia/Kolkata')
    .onRun(async () => {
        const db = admin.firestore();
        const now = Date.now();

        // 1. Abandoned test questions (older than 24h)
        const testQCutoff = admin.firestore.Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);
        const abandonedTestsQuery = db.collection('_test_questions')
            .where('createdAt', '<', testQCutoff);

        const deletedTests = await deleteInBatches(abandonedTestsQuery);
        if (deletedTests > 0) {
            console.log(`Cleaned up ${deletedTests} abandoned _test_questions docs`);
        }

        // 2. Stale cached tests (older than 7 days)
        const cacheCutoff = admin.firestore.Timestamp.fromMillis(now - 7 * 24 * 60 * 60 * 1000);
        const staleCacheQuery = db.collection('cached_tests')
            .where('createdAt', '<', cacheCutoff);

        const deletedCache = await deleteInBatches(staleCacheQuery);
        if (deletedCache > 0) {
            console.log(`Cleaned up ${deletedCache} stale cached_tests docs`);
        }

        console.log(`Cleanup complete: ${deletedTests} tests, ${deletedCache} cache entries removed`);
        return null;
    });
