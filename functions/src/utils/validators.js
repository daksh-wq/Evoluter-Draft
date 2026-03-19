/**
 * Input Validators & Safety Helpers
 * Covers SSRF URL validation, batch chunking, and input guards.
 */
const functions = require('firebase-functions');

/**
 * SSRF-safe URL validation.
 * Only allows HTTPS URLs and blocks private/internal endpoints.
 * @param {string} url - URL to validate
 * @throws {functions.https.HttpsError} If URL is unsafe
 */
function validateUrl(url) {
    if (!url || typeof url !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'URL is required');
    }

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid URL format');
    }

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Only HTTPS URLs are allowed'
        );
    }

    // Block internal/private hostnames
    const blockedHosts = [
        'metadata.google.internal',
        'metadata.google.com',
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '169.254.169.254',       // AWS/GCP metadata
        '[::1]',
    ];

    const hostname = parsed.hostname.toLowerCase();
    if (blockedHosts.includes(hostname)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Access to internal endpoints is not allowed'
        );
    }

    // Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
        const [, a, b] = ipMatch.map(Number);
        if (
            a === 10 ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            a === 127 ||
            a === 0
        ) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Access to private network addresses is not allowed'
            );
        }
    }

    return parsed;
}

/**
 * Chunk an array of Firestore batch operations into groups ≤ maxSize.
 * Firestore batch.commit() has a hard limit of 500 operations.
 * @param {Array} items - Items to batch
 * @param {number} maxSize - Max items per batch (default 499)
 * @returns {Array<Array>} Array of chunks
 */
function chunkArray(items, maxSize = 499) {
    const chunks = [];
    for (let i = 0; i < items.length; i += maxSize) {
        chunks.push(items.slice(i, i + maxSize));
    }
    return chunks;
}

/**
 * Commit Firestore writes in safe batches of ≤499 operations.
 * @param {import('firebase-admin').firestore.Firestore} db - Firestore instance
 * @param {Array<{ref: DocumentReference, data: Object, options?: Object}>} operations - Write operations
 * @returns {Promise<void>}
 */
async function commitInBatches(db, operations) {
    const chunks = chunkArray(operations, 499);

    for (const chunk of chunks) {
        const batch = db.batch();
        for (const op of chunk) {
            batch.set(op.ref, op.data, op.options || {});
        }
        await batch.commit();
    }
}

module.exports = { validateUrl, chunkArray, commitInBatches };
