/**
 * PDF Processing Cloud Functions
 * Upgraded: topic identification, question-type diversity, 3-layer solution
 *
 * Production hardening:
 * - SSRF-safe URL validation (CRIT-3 fix)
 * - Shared prompt helpers (eliminates duplication)
 * - Shared AI client
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const pdf = require('pdf-parse');
const { checkAndIncrementRateLimit } = require('./rateLimit');
const { generateJSON } = require('./utils/geminiClient');
const {
    buildTypeDistributionInstruction,
    THREE_LAYER_SOLUTION_INSTRUCTION,
    TAGGING_INSTRUCTION,
    parseAIJsonResponse,
} = require('./utils/promptHelpers');
const { validateUrl } = require('./utils/validators');

/** Maximum PDF file size (20MB) */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Chunk text into segments for AI processing (respects paragraph boundaries)
 */
function chunkText(text, maxLength = 6000) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
        if ((currentChunk + '\n\n' + para).length > maxLength && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = para;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
    }

    if (currentChunk.trim()) chunks.push(currentChunk.trim());
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

        // SSRF-safe URL validation (CRIT-3 fix)
        validateUrl(pdfUrl);

        await checkAndIncrementRateLimit(userId, 'pdf_extraction');

        try {
            const headResponse = await axios.head(pdfUrl, { timeout: 10000 });
            const fileSize = parseInt(headResponse.headers['content-length'] || '0');

            if (fileSize > MAX_FILE_SIZE) {
                throw new functions.https.HttpsError(
                    'invalid-argument',
                    `File too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum is 20MB.`
                );
            }

            const pdfResponse = await axios.get(pdfUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
            });
            const pdfBuffer = Buffer.from(pdfResponse.data);
            const pdfData = await pdf(pdfBuffer);
            const chunks = chunkText(pdfData.text);

            return {
                text: pdfData.text,
                pages: pdfData.numpages,
                wordCount: pdfData.text.split(/\s+/).length,
                chunks,
                chunkCount: chunks.length,
            };
        } catch (error) {
            if (error instanceof functions.https.HttpsError) throw error;
            console.error('PDF extraction error:', error.message);
            throw new functions.https.HttpsError('internal', 'Failed to extract PDF text');
        }
    });

/**
 * Generate questions from extracted PDF text.
 */
exports.generateQuestionsFromPDF = functions
    .runWith({ timeoutSeconds: 300, memory: '1GB' })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const {
            textChunks,
            documentTitle = 'Document',
            questionCount = 10,
            difficulty = 'Hard',
        } = data;
        const userId = context.auth.uid;

        if (!textChunks || !Array.isArray(textChunks) || textChunks.length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'textChunks array is required');
        }

        await checkAndIncrementRateLimit(userId, 'question_generation');

        // Step 1: Topic Identification
        let identifiedTopics = [];
        const combinedPreview = textChunks.slice(0, 2).join('\n\n').substring(0, 3000);

        try {
            const topicPrompt = `Read this document excerpt and identify the top 3-5 primary academic topics/subjects it covers.
These should match competitive exam (UPSC/State PSC) syllabus areas.

DOCUMENT EXCERPT:
${combinedPreview}

Return ONLY a JSON array of topic strings (max 5):
["Topic 1", "Topic 2", "Topic 3"]`;

            const topicText = await generateJSON(topicPrompt);
            const parsed = parseAIJsonResponse(topicText, 'array');
            if (Array.isArray(parsed)) identifiedTopics = parsed;
            console.log(`Identified topics: ${identifiedTopics.join(', ')}`);
        } catch (e) {
            console.warn('Topic identification failed:', e.message);
        }

        // Step 2: Generate document-based questions from chunks
        const docQCount = questionCount;
        const allDocQuestions = [];
        const seenTexts = new Set();
        let retryCount = 0;

        const questionsPerChunk = Math.ceil(docQCount / textChunks.length);

        const chunkPromises = textChunks.map(async (chunk, index) => {
            const isLastChunk = index === textChunks.length - 1;
            const targetQCount = isLastChunk
                ? docQCount - (questionsPerChunk * (textChunks.length - 1))
                : questionsPerChunk;

            if (targetQCount <= 0) return [];

            const typeInstruction = buildTypeDistributionInstruction(targetQCount);
            const prompt = `You are an expert question generator for competitive exam preparation.
Based on the specific document chunk below, generate EXACTLY ${targetQCount} high-quality MCQs.
Go BEYOND surface-level recall — test conceptual understanding using the document as context.

IDENTIFIED TOPICS: ${identifiedTopics.join(', ') || 'General'}
DOCUMENT CHUNK (Part ${index + 1} of ${textChunks.length}):
${chunk}

INSTRUCTIONS:
- Difficulty: ${difficulty}
- Avoid questions that just match text verbatim — test deeper understanding
${typeInstruction}
${THREE_LAYER_SOLUTION_INSTRUCTION}
${TAGGING_INSTRUCTION}

Return ONLY a valid JSON array:
[
  {
    "text": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "difficultyLevel": "${difficulty}",
    "questionType": "Statement-based",
    "topic": "Main topic",
    "solution": {
      "correctAnswerReason": "...",
      "sourceOfQuestion": "Document / Standard reference",
      "approachToSolve": "..."
    },
    "subjectCode": "...",
    "topicCode": "...",
    "sourceCode": "...",
    "typeCode": "...",
    "difficultyCode": "...",
    "pyqCode": "..."
  }
]

Generate EXACTLY ${targetQCount} unique questions using the JSON structure above. Return ONLY the JSON array.`;

            try {
                const responseText = await generateJSON(prompt);
                const questions = parseAIJsonResponse(responseText, 'array');
                return Array.isArray(questions) ? questions : [];
            } catch (error) {
                console.error('Chunk question generation error:', error.message);
                return [];
            }
        });

        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.flat().forEach(q => {
            const key = (q.text || '').trim().toLowerCase();
            if (key && !seenTexts.has(key)) {
                seenTexts.add(key);
                allDocQuestions.push(q);
            }
        });

        // Fill-up loop if we are short
        while (allDocQuestions.length < docQCount && retryCount < 2) {
            retryCount++;
            const deficit = docQCount - allDocQuestions.length;
            const currentBatchSize = Math.min(deficit, 15);
            const existingSummary = allDocQuestions.slice(-20).map(q => (q.text || '').substring(0, 60)).join(' | ');

            const fillPrompt = `You are a Question Setter. Generate EXACTLY ${currentBatchSize} MORE unique ${difficulty} MCQs based on this document.
DO NOT repeat these questions (already generated):
${existingSummary}

DOCUMENT CONTENT:
${textChunks[0].substring(0, 8000)}

${buildTypeDistributionInstruction(currentBatchSize)}
${THREE_LAYER_SOLUTION_INSTRUCTION}

Return ONLY a JSON Array (same format as before).`;

            try {
                const fillText = await generateJSON(fillPrompt);
                const fillParsed = parseAIJsonResponse(fillText, 'array');
                if (Array.isArray(fillParsed)) {
                    fillParsed.filter(q => {
                        const key = (q.text || '').trim().toLowerCase();
                        if (!key || seenTexts.has(key)) return false;
                        seenTexts.add(key);
                        return true;
                    }).forEach(q => allDocQuestions.push(q));
                }
            } catch (err) {
                console.warn('Fill-up round failed:', err.message);
            }
        }

        // Step 3: Merge, deduplicate, tag, and return
        const safeTitle = (documentTitle || 'Document').substring(0, 30);
        const finalQuestions = allDocQuestions
            .slice(0, questionCount)
            .map((q, idx) => ({
                ...q,
                id: `pdf-${Date.now()}-${idx}`,
                difficulty: q.difficultyLevel || difficulty,
                questionType: q.questionType || 'Statement-based',
                solution: q.solution || {
                    correctAnswerReason: q.explanation || '',
                    sourceOfQuestion: `Document: ${safeTitle}`,
                    approachToSolve: 'Review the relevant section of the document.',
                },
                explanation: q.solution?.correctAnswerReason || q.explanation || '',
                tags: [
                    { type: 'source', label: `Document: ${safeTitle}` },
                    { type: 'topic', label: q.topic || identifiedTopics[0] || 'General' },
                    { type: 'difficulty', label: q.difficultyLevel || difficulty },
                ],
            }));

        return {
            questions: finalQuestions,
            totalGenerated: allDocQuestions.length,
            requested: questionCount,
            identifiedTopics,
        };
    });
