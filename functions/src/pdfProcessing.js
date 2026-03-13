/**
 * PDF Processing Cloud Functions
 * Upgraded: topic identification, question-type diversity, 3-layer solution, PYQ blending
 */
const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('pdf-parse');
const axios = require('axios');
const { checkAndIncrementRateLimit } = require('./rateLimit');

const genAI = new GoogleGenerativeAI(functions.config().gemini?.api_key || process.env.GEMINI_API_KEY || '');

/** Maximum PDF file size (20MB) */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// ─── Shared helpers (duplicated from testGeneration for cloud function isolation) ───

function buildTypeDistributionInstruction(count) {
    const statement = Math.round(count * 0.45);
    const ar        = Math.round(count * 0.25);
    const matching  = Math.round(count * 0.20);
    const direct    = count - statement - ar - matching;

    return `
QUESTION TYPE DISTRIBUTION (strictly follow):
- ${statement} Statement-based questions (e.g., "Which of the following statements is/are correct?")
- ${ar} Assertion-Reasoning questions (Format: "Assertion (A): ... Reason (R): ..." with 4 standard A-R options)
- ${matching} Matching/Pair-based questions. CRITICAL: The "text" field MUST contain both lists clearly formatted using newlines. STRICTLY limit List-I to exactly 4 items (1, 2, 3, 4) and List-II to exactly 4 items (A, B, C, D). Do NOT add extra items like E, F, etc.
  Example format:
  Match List-I with List-II:
  List-I:
  1. Item 1
  2. Item 2
  3. Item 3
  4. Item 4
  List-II:
  A. Desc A
  B. Desc B
  C. Desc C
  D. Desc D
- ${direct} Direct Factual questions (e.g., "Which of the following is NOT correct regarding...")

CRITICAL OPTION FORMATTING RULE:
For the "options" JSON array ONLY: DO NOT prefix options with A), B), C), D), 1., 2., etc. The options array must contain ONLY the raw option text.
BAD: ["A) 1-B, 2-A", "B) 1-A, 2-B"]
GOOD: ["1-B, 2-A", "1-A, 2-B"]
NOTE: You MAY use A., B., 1., 2. inside the question "text" field for List-I and List-II.`;
}

const THREE_LAYER_SOLUTION_INSTRUCTION = `
SOLUTION FORMAT (mandatory for every question — 3 layers):
"solution": {
  "correctAnswerReason": "Concise explanation of WHY the correct option is correct (1-2 sentences)",
  "sourceOfQuestion": "Reference source: NCERT / Article / Act / Standard text",
  "approachToSolve": "Strategy to eliminate wrong options and identify the correct answer"
}`;

/**
 * Chunk text into segments for AI processing (improved: respects paragraph boundaries)
 */
function chunkText(text, maxLength = 6000) {
    const chunks = [];
    // Split on double newlines (paragraphs) first
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

        if (!pdfUrl) {
            throw new functions.https.HttpsError('invalid-argument', 'pdfUrl is required');
        }

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
                timeout: 30000
            });
            const pdfBuffer = Buffer.from(pdfResponse.data);
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
 * Generate questions from extracted PDF text.
 * Step 1: Identify topics from PDF.
 * Step 2: Generate diverse questions (A-R, Matching, Statement, Direct).
 * Step 3: Enrich each with 3-layer solution + self-assessed difficulty.
 * Step 4: Add model-generated PYQ-style questions on identified topic.
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
            difficulty = 'Hard'
        } = data;
        const userId = context.auth.uid;

        if (!textChunks || !Array.isArray(textChunks) || textChunks.length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'textChunks array is required');
        }

        await checkAndIncrementRateLimit(userId, 'question_generation');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // ─── Step 1: Topic Identification ───────────────────────────────────────
        let identifiedTopics = [];
        const combinedPreview = textChunks.slice(0, 2).join('\n\n').substring(0, 3000);

        try {
            const topicPrompt = `Read this document excerpt and identify the top 3-5 primary academic topics/subjects it covers.
These should match competitive exam (UPSC/State PSC) syllabus areas.

DOCUMENT EXCERPT:
${combinedPreview}

Return ONLY a JSON array of topic strings (max 5):
["Topic 1", "Topic 2", "Topic 3"]`;

            const topicResult = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: topicPrompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            });

            const topicText = topicResult.response.text();
            let parsed = [];
            try { parsed = JSON.parse(topicText); } catch {
                const m = topicText.match(/\[[\s\S]*\]/);
                if (m) parsed = JSON.parse(m[0]);
            }
            if (Array.isArray(parsed)) identifiedTopics = parsed;
            console.log(`Identified topics: ${identifiedTopics.join(', ')}`);
        } catch (e) {
            console.warn('Topic identification failed:', e);
        }

        // ─── Step 2: Decide split — 100% document-based AI Qs (No PYQ blending) ───
        const pyqStyleCount = 0;
        const docQCount     = questionCount;

        // ─── Step 3: Generate document-based questions from chunks (Batched) ───
        const BATCH_SIZE = 15;
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
    }
  }
]

Generate EXACTLY ${targetQCount} unique questions. Return ONLY the JSON array.`;

            try {
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                });

                const responseText = result.response.text();
                let questions = [];

                try {
                    questions = JSON.parse(responseText);
                } catch {
                    const arrayMatch = responseText.match(/\[[\s\S]*\]/);
                    if (arrayMatch) questions = JSON.parse(arrayMatch[0]);
                }

                return Array.isArray(questions) ? questions : [];
            } catch (error) {
                console.error('Chunk question generation error:', error);
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

        // --- Step 3.5: Fill-up loop if we are short across all chunks ---
        while (allDocQuestions.length < docQCount && retryCount < 2) {
            retryCount++;
            const deficit = docQCount - allDocQuestions.length;
            const currentBatchSize = Math.min(deficit, BATCH_SIZE);
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
                const fillResult = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: fillPrompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                });

                const fillText = fillResult.response.text();
                let fillParsed = [];
                try {
                    fillParsed = JSON.parse(fillText);
                } catch {
                    const arrayMatch = fillText.match(/\[[\s\S]*\]/);
                    if (arrayMatch) fillParsed = JSON.parse(arrayMatch[0]);
                }

                if (Array.isArray(fillParsed)) {
                    const uniqueFills = fillParsed.filter(q => {
                        const key = (q.text || '').trim().toLowerCase();
                        if (!key || seenTexts.has(key)) return false;
                        seenTexts.add(key);
                        return true;
                    });
                    allDocQuestions.push(...uniqueFills);
                }
            } catch (err) {
                console.warn('Fill-up round failed:', err);
            }
        }

        // ─── Step 4: Generate PYQ-style questions on identified topics ───────────
        const allPyqQuestions = [];
        if (pyqStyleCount > 0 && identifiedTopics.length > 0) {
            const topicsStr = identifiedTopics.slice(0, 3).join(', ');
            const typeInstruction = buildTypeDistributionInstruction(pyqStyleCount);

            const pyqPrompt = `You are a UPSC/competitive exam expert. The student is studying about: "${topicsStr}" (identified from their PDF document).
Generate EXACTLY ${pyqStyleCount} Previous Year Question (PYQ) style MCQs on these topics.
These should be classic UPSC-style questions connected to the topics — NOT directly from the document text.

${typeInstruction}
${THREE_LAYER_SOLUTION_INSTRUCTION}

Difficulty: ${difficulty}

Return ONLY a valid JSON array (same format):
[
  {
    "text": "Question?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 0,
    "difficultyLevel": "${difficulty}",
    "questionType": "Statement-based",
    "topic": "${identifiedTopics[0] || 'General'}",
    "solution": {
      "correctAnswerReason": "...",
      "sourceOfQuestion": "PYQ-style / ${topicsStr}",
      "approachToSolve": "..."
    }
  }
]`;

            try {
                const pyqResult = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: pyqPrompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                });

                const pyqText = pyqResult.response.text();
                let pyqParsed;
                try { pyqParsed = JSON.parse(pyqText); } catch {
                    const m = pyqText.match(/\[[\s\S]*\]/);
                    if (m) pyqParsed = JSON.parse(m[0]);
                }
                if (Array.isArray(pyqParsed)) allPyqQuestions.push(...pyqParsed);
            } catch (e) {
                console.warn('PYQ-style generation failed:', e);
            }
        }

        // ─── Step 5: Merge, deduplicate, tag, and return ─────────────────────────
        const combined = [...allDocQuestions, ...allPyqQuestions];

        const finalQuestions = combined
            .slice(0, questionCount)
            .map((q, idx) => ({
                ...q,
                id: `pdf-${Date.now()}-${idx}`,
                difficulty: q.difficultyLevel || difficulty,
                questionType: q.questionType || 'Statement-based',
                solution: q.solution || {
                    correctAnswerReason: q.explanation || '',
                    sourceOfQuestion: `Document: ${documentTitle.substring(0, 30)}`,
                    approachToSolve: 'Review the relevant section of the document.'
                },
                explanation: q.solution?.correctAnswerReason || q.explanation || '',
                tags: [
                    { type: 'source', label: `Document: ${documentTitle.substring(0, 30)}` },
                    { type: 'topic', label: q.topic || identifiedTopics[0] || 'General' },
                    { type: 'difficulty', label: q.difficultyLevel || difficulty }
                ]
            }));

        return {
            questions: finalQuestions,
            totalGenerated: combined.length,
            requested: questionCount,
            identifiedTopics
        };
    });
