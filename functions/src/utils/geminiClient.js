/**
 * Centralized Gemini AI Client
 *
 * Uses process.env.GEMINI_API_KEY (modern Firebase Functions approach).
 *
 * Local dev:  set GEMINI_API_KEY in functions/.env  (auto-loaded by the emulator)
 * Production: firebase functions:secrets:set GEMINI_API_KEY
 *             then add `secrets: ['GEMINI_API_KEY']` to runWith() on each function.
 */

let _genAIInstance = null;

/**
 * Get or create the GoogleGenerativeAI instance (lazy singleton).
 * Re-creates if the instance was previously null (cold start safety).
 */
function getGenAI() {
    if (_genAIInstance) return _genAIInstance;

    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
        const { HttpsError } = require('firebase-functions/v2/https');
        throw new HttpsError(
            'failed-precondition',
            'Gemini API key is not configured. ' +
            'Local dev: add GEMINI_API_KEY=your_key to functions/.env\n' +
            'Production: run  firebase functions:secrets:set GEMINI_API_KEY'
        );
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    _genAIInstance = new GoogleGenerativeAI(apiKey);
    return _genAIInstance;
}

/**
 * Get a pre-configured Gemini model instance.
 * @param {string} model - Model name (default: 'gemini-2.0-flash')
 */
function getModel(model = 'gemini-2.0-flash') {
    return getGenAI().getGenerativeModel({ model });
}

/**
 * Check if an error is transient and worth retrying.
 */
function isTransientError(err) {
    const msg = (err.message || '').toLowerCase();
    const status = err.status || err.code || 0;
    if ([429, 500, 502, 503].includes(status)) return true;
    if (msg.includes('rate limit') || msg.includes('quota')) return true;
    if (msg.includes('internal') || msg.includes('unavailable')) return true;
    if (msg.includes('econnreset') || msg.includes('timeout')) return true;
    return false;
}

/**
 * Generate content with JSON response config and exponential-backoff retry.
 * @param {string} prompt
 * @param {string} model
 * @param {number} maxRetries
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

            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            console.warn(`Gemini attempt ${attempt + 1} failed (${err.message}), retrying in ${Math.round(delay)}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

module.exports = { getGenAI, getModel, generateJSON };
