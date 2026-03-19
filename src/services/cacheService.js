/**
 * Cache Service
 * SCALE-1/SCALE-5: Client-side localStorage cache with TTL
 * 
 * Reduces Firestore reads by caching non-critical data locally.
 * Uses localStorage with time-to-live (TTL) expiration.
 */
import logger from '../utils/logger';

/** Default cache prefix to avoid localStorage collisions */
const CACHE_PREFIX = 'evoluter_cache_';

/**
 * Default TTL values in seconds for different cache types
 */
export const CACHE_TTL = {
    NEWS: 12 * 60 * 60,         // 12 hours (was 6h — news doesn't change that fast)
    LEADERBOARD: 5 * 60,        // 5 minutes
    SYLLABUS: 7 * 24 * 60 * 60, // 7 days (was 24h — syllabus is nearly static)
    USER_DOCS: 10 * 60,         // 10 minutes
    GENERAL: 5 * 60,            // 5 minutes
    QUESTION_BANK: 30 * 60,     // 30 minutes
    FLASHCARDS: 15 * 60,        // 15 minutes
    TEST_HISTORY: 10 * 60,      // 10 minutes
};

/**
 * Get a cached value by key
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if expired/missing
 */
export function getFromCache(key) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;

        const cached = JSON.parse(raw);
        const now = Date.now();

        if (cached.expiresAt < now) {
            // Cache expired — clean up
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        return cached.value;
    } catch (error) {
        logger.warn(`Cache read error for key "${key}":`, error);
        return null;
    }
}

/**
 * Save a value to cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (must be JSON-serializable)
 * @param {number} ttlSeconds - Time-to-live in seconds
 */
export function saveToCache(key, value, ttlSeconds = CACHE_TTL.GENERAL) {
    try {
        const cacheEntry = {
            value,
            expiresAt: Date.now() + (ttlSeconds * 1000),
            cachedAt: Date.now()
        };

        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
    } catch (error) {
        // localStorage full or disabled — fail silently
        logger.warn(`Cache write error for key "${key}":`, error);
    }
}

/**
 * Remove a specific cache entry
 * @param {string} key - Cache key to remove
 */
export function removeFromCache(key) {
    try {
        localStorage.removeItem(CACHE_PREFIX + key);
    } catch {
        // Ignore
    }
}

/**
 * Clear all Evoluter cache entries from localStorage
 */
export function clearAllCache() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        logger.info(`Cleared ${keysToRemove.length} cache entries`);
    } catch (error) {
        logger.warn('Cache clear error:', error);
    }
}

// ─── In-flight request deduplication ─────────────────────────────────────────
const inflightRequests = new Map();

/**
 * Get cached data or fetch fresh data with caching + deduplication
 * If the same key is already being fetched, returns the existing promise
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch fresh data
 * @param {number} ttlSeconds - TTL in seconds
 * @returns {Promise<any>} Cached or fresh data
 */
export async function getCachedOrFetch(key, fetchFn, ttlSeconds = CACHE_TTL.GENERAL) {
    // Try cache first
    const cached = getFromCache(key);
    if (cached !== null) {
        return cached;
    }

    // Deduplicate: if this key is already being fetched, return the same promise
    if (inflightRequests.has(key)) {
        return inflightRequests.get(key);
    }

    // Create the fetch promise and track it
    const fetchPromise = (async () => {
        try {
            const freshData = await fetchFn();

            if (freshData !== null && freshData !== undefined) {
                saveToCache(key, freshData, ttlSeconds);
            }

            return freshData;
        } finally {
            inflightRequests.delete(key);
        }
    })();

    inflightRequests.set(key, fetchPromise);
    return fetchPromise;
}

export default {
    get: getFromCache,
    set: saveToCache,
    remove: removeFromCache,
    clearAll: clearAllCache,
    getOrFetch: getCachedOrFetch,
    TTL: CACHE_TTL,
};
