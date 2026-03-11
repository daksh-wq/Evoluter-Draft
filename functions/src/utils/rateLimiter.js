const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Rate Limiter for Cloud Functions
 * Prevents abuse by limiting execution frequency per user or IP.
 */
class RateLimiter {
    /**
     * Check if a user has exceeded their rate limit
     * @param {string} userId - User ID or IP address
     * @param {string} action - Action name (e.g., 'generate_test')
     * @param {number} limit - Max requests allowed
     * @param {number} windowSeconds - Time window in seconds
     * @returns {Promise<boolean>} - True if allowed, throws error if exceeded
     */
    static async check(userId, action, limit = 10, windowSeconds = 60) {
        if (!userId) return true; // Skip if no user ID provided (e.g. testing)

        const now = Date.now();
        const windowStart = now - (windowSeconds * 1000);

        const ref = db.collection('rate_limits').doc(`${userId}_${action}`);

        try {
            await db.runTransaction(async (t) => {
                const doc = await t.get(ref);
                let data = doc.data() || { count: 0, startTime: now };

                // Reset window if time passed
                if (data.startTime < windowStart) {
                    data = { count: 0, startTime: now };
                }

                if (data.count >= limit) {
                    throw new Error(`Rate limit exceeded for ${action}. Try again later.`);
                }

                t.set(ref, {
                    count: data.count + 1,
                    startTime: data.startTime,
                    lastRequest: now
                });
            });
            return true;
        } catch (error) {
            // Rethrow specific rate limit error
            if (error.message.includes('Rate limit exceeded')) throw error;
            console.error('Rate Limiter Error:', error);
            return true; // Fail open in case of DB error (don't block legitimate users)
        }
    }
}

module.exports = RateLimiter;
