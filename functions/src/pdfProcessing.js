/**
 * PDF Processing Cloud Functions
 * F-5: Server-side PDF text extraction + AI question generation
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('pdf-parse');
const axios = require('axios');
const { checkAndIncrementRateLimit } = require('./rateLimit');

const genAI = new GoogleGenerativeAI(functions.config().gemini?.api_key || process.env.GEMINI_API_KEY || '');

/** Maximum PDF file size (20MB) */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Chunk text into segments for AI processing
 */
function chunkText(text, maxLength = 5000) {
    const chunks = [];
    let currentChunk = '';

    const sentences = text.split('. ');

    sentences.forEach(sentence => {
        if ((currentChunk + sentence).length > maxLength) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? '. ' : '') + sentence;
        }
    });

    if (currentChunk) chunks.push(currentChunk);

    return chunks;
}

/**
 * Extract text content from a PDF URL
 */
exports.extractTextFromPDF = functions
    .runWith({ timeoutSeconds: 120, memory: '512MB' })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { pdfUrl } = data;
        const userId = context.auth.uid;

        if (!pdfUrl) {
            throw new functions.https.HttpsError('invalid-argument', 'pdfUrl is required');
        }

        // Rate limit
        await checkAndIncrementRateLimit(userId, 'pdf_extraction');

        try {
            // Check file size with HEAD request
            const headResponse = await axios.head(pdfUrl, { timeout: 10000 });
            const fileSize = parseInt(headResponse.headers['content-length'] || '0');

            if (fileSize > MAX_FILE_SIZE) {
                throw new functions.https.HttpsError(
                    'invalid-argument',
                    `File too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum is 20MB.`
                );
            }

            // Download PDF
            const pdfResponse = await axios.get(pdfUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            const pdfBuffer = Buffer.from(pdfResponse.data);

            // Extract text
            const pdfData = await pdf(pdfBuffer);

            const chunks = chunkText(pdfData.text);

            return {
                text: pdfData.text,
                pages: pdfData.numpages,
                wordCount: pdfData.text.split(/\s+/).length,
                chunks,
                chunkCount: chunks.length
            };

        } catch (error) {
            if (error instanceof functions.https.HttpsError) throw error;
            console.error('PDF extraction error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to extract PDF text');
        }
    });

/**
 * Generate questions from extracted PDF text chunks
 */
exports.generateQuestionsFromPDF = functions
    .runWith({ timeoutSeconds: 300, memory: '1GB' })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { textChunks, documentTitle = 'Document', questionCount = 10, difficulty = 'Hard' } = data;
        const userId = context.auth.uid;

        if (!textChunks || !Array.isArray(textChunks) || textChunks.length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'textChunks array is required');
        }

        // Rate limit
        await checkAndIncrementRateLimit(userId, 'question_generation');

        const questionsPerChunk = Math.ceil(questionCount / textChunks.length);
        const allQuestions = [];

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        for (const chunk of textChunks) {
            const prompt = `Based on this text, generate ${questionsPerChunk} ${difficulty} multiple-choice questions.

Text: ${chunk}

Return ONLY a JSON array:
[
  {
    "text": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is correct.",
    "topic": "Main topic from text"
  }
]`;

            try {
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                });

                const responseText = result.response.text();
                let questions;

                try {
                    questions = JSON.parse(responseText);
                } catch {
                    const arrayMatch = responseText.match(/\[[\s\S]*\]/);
                    if (arrayMatch) {
                        questions = JSON.parse(arrayMatch[0]);
                    } else {
                        continue; // Skip this chunk on parse failure
                    }
                }

                if (Array.isArray(questions)) {
                    allQuestions.push(...questions);
                }
            } catch (error) {
                console.error(`Chunk question generation error:`, error);
                // Continue with other chunks
            }
        }

        // Add IDs and tags
        const finalQuestions = allQuestions.slice(0, questionCount).map((q, idx) => ({
            ...q,
            id: `pdf-${Date.now()}-${idx}`,
            tags: [
                { type: 'source', label: `Document: ${documentTitle.substring(0, 30)}` },
                { type: 'topic', label: q.topic || 'General' },
                { type: 'difficulty', label: difficulty }
            ]
        }));

        return {
            questions: finalQuestions,
            totalGenerated: allQuestions.length,
            requested: questionCount
        };
    });
