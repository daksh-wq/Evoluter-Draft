const functions = require('firebase-functions');
const { getModel } = require('./utils/geminiClient');

exports.callGemini = functions.runWith({ timeoutSeconds: 120, memory: '256MB' }).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    const prompt = data.prompt;
    const isJson = data.isJson || false;
    const modelName = data.model || 'gemini-2.5-flash';

    if (!prompt) {
        throw new functions.https.HttpsError('invalid-argument', 'Prompt is required');
    }

    try {
        const m = getModel(modelName);
        const config = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        };
        if (isJson) {
            config.generationConfig = { responseMimeType: 'application/json' };
        }
        const result = await m.generateContent(config);
        return { text: result.response.text() };
    } catch (error) {
        console.error('Proxy Gemini Error:', error);
        throw new functions.https.HttpsError('internal', 'Gemini API failed');
    }
});
