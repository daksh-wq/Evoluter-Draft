/**
 * Centralized Gemini AI Client
 * 
 * Single source of truth for AI client initialization.
 * - Lazy-initializes on first call (improves cold start for non-AI functions)
 * - Throws early if API key is missing (HIGH-3 fix)
 * - Avoids 4x duplicate initialization across modules
 */
const functions = require('firebase-functions');

let _genAIInstance = null;

/**
 * Get or create the GoogleGenerativeAI instance.
 * Lazy-loaded to avoid pulling in the SDK when non-AI functions are invoked.
 * @returns {import('@google/generative-ai').GoogleGenerativeAI}
 */
function getGenAI() {
    if (_genAIInstance) return _genAIInstance;

    const apiKey = functions.config().gemini?.api_key
        || process.env.GEMINI_API_KEY
        || '';

    if (!apiKey) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Gemini API key is not configured. Set it via firebase functions:config:set gemini.api_key="YOUR_KEY"'
        );
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    _genAIInstance = new GoogleGenerativeAI(apiKey);
    return _genAIInstance;
}

/**
 * Get a pre-configured Gemini model instance.
 * @param {string} model - Model name (default: 'gemini-2.0-flash')
 * @returns {import('@google/generative-ai').GenerativeModel}
 */
function getModel(model = 'gemini-2.0-flash') {
    return getGenAI().getGenerativeModel({ model });
}

/**
 * Check if an error is transient and worth retrying.
 * @param {Error} err
 * @returns {boolean}
 */
function isTransientError(err) {
    const msg = (err.message || '').toLowerCase();
    const status = err.status || err.code || 0;
    // Retry on rate limits (429), server errors (500-503), and network issues
    if ([429, 500, 502, 503].includes(status)) return true;
    if (msg.includes('rate limit') || msg.includes('quota')) return true;
    if (msg.includes('internal') || msg.includes('unavailable')) return true;
    if (msg.includes('econnreset') || msg.includes('timeout')) return true;
    return false;
}

/**
 * Generate content with standard JSON response config.
 * Includes retry with exponential backoff for transient errors.
 * @param {string} prompt - The prompt text
 * @param {string} model - Model name
 * @param {number} maxRetries - Max retry attempts (default: 3)
 * @returns {Promise<string>} Raw response text
 */
async function generateJSON(prompt, model = 'gemini-2.0-flash', maxRetries = 3) {
    const m = getModel(model);
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const result = await m.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' },
            });
            return result.response.text();
        } catch (err) {
            const isLast = attempt === maxRetries - 1;
            if (isLast || !isTransientError(err)) throw err;

            // Exponential backoff: 1s, 2s, 4s + random jitter (0-500ms)
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            console.warn(`Gemini API attempt ${attempt + 1} failed (${err.message}), retrying in ${Math.round(delay)}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

module.exports = { getGenAI, getModel, generateJSON };
