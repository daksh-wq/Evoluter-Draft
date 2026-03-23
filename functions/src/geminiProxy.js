/**
 * Gemini AI Proxy — Cloud Functions
 *
 * All Gemini API calls are routed through here.
 * Key management:
 *   Local dev:   set GEMINI_API_KEY in functions/.env  (auto-loaded by emulator)
 *   Production:  firebase functions:secrets:set GEMINI_API_KEY
 *                (stored in Google Cloud Secret Manager, injected as process.env)
 *
 * Functions exported:
 *   geminiGenerateQuestions       — topic-based MCQ generation
 *   geminiGenerateFromDocument    — PDF/document-based MCQ generation
 *   geminiEvaluateAnswer          — Mains answer evaluation
 *   geminiAnalyzePerformance      — Post-test performance analysis
 *   geminiSuggestTopics           — AI topic autocomplete
 *   geminiGenerateNews            — Current affairs news feed
 */

const functions = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const { checkAndIncrementRateLimit } = require('./rateLimit');
const { generateJSON } = require('./utils/geminiClient');
const {
    buildTypeDistributionInstruction,
    THREE_LAYER_SOLUTION_INSTRUCTION,
    TAGGING_INSTRUCTION,
    parseAIJsonResponse,
    sanitizeForPrompt,
} = require('./utils/promptHelpers');

// Declare the secret — Firebase injects it as process.env.GEMINI_API_KEY at runtime
const geminiApiKey = defineSecret('GEMINI_API_KEY');


// ─── Shared prompt helpers (mirrored from client geminiService.js) ────────────

const DIFFICULTY_DISTRIBUTION = {
    Easy:         { Easy: 0.70, Intermediate: 0.20, Hard: 0.10 },
    Intermediate: { Easy: 0.20, Intermediate: 0.60, Hard: 0.20 },
    Hard:         { Easy: 0.10, Intermediate: 0.30, Hard: 0.60 },
};

function buildDifficultyInstruction(batchSize, difficulty) {
    const dist = DIFFICULTY_DISTRIBUTION[difficulty] || DIFFICULTY_DISTRIBUTION['Hard'];
    const easyCount = Math.round(batchSize * dist.Easy);
    const midCount  = Math.round(batchSize * dist.Intermediate);
    const hardCount = batchSize - easyCount - midCount;
    return `DIFFICULTY DISTRIBUTION (strictly follow for this batch of ${batchSize} questions):
- ${easyCount} Easy questions
- ${midCount} Intermediate questions
- ${hardCount} Hard questions
Each question MUST carry a self-assessed 'difficultyLevel' field: one of 'Easy', 'Intermediate', or 'Hard'.`;
}

function normalizeQuestion(q, idx, defaults = {}) {
    return {
        id: defaults.idPrefix ? `${defaults.idPrefix}-${Date.now()}-${idx}` : `ai-${Date.now()}-${idx}`,
        topic: defaults.topic || q.topic || 'General',
        difficulty: q.difficultyLevel || defaults.difficulty || 'Hard',
        questionType: q.questionType || 'Statement-based',
        text: q.text || '',
        options: q.options || [],
        correctAnswer: Number(q.correctAnswer) || 0,
        solution: q.solution || {
            correctAnswerReason: q.explanation || '',
            sourceOfQuestion: 'General Knowledge',
            approachToSolve: 'Eliminate incorrect options systematically.',
        },
        explanation: q.solution?.correctAnswerReason || q.explanation || '',
        subjectCode: q.subjectCode || undefined,
        topicCode: q.topicCode || undefined,
        sourceCode: q.sourceCode || undefined,
        typeCode: q.typeCode || undefined,
        difficultyCode: q.difficultyCode || undefined,
        pyqCode: q.pyqCode || undefined,
        tags: q.tags || [],
    };
}

// ─── 1. Generate MCQ Questions (topic-based) ─────────────────────────────────

exports.geminiGenerateQuestions = functions
    .runWith({ timeoutSeconds: 540, memory: '1GB', secrets: ['GEMINI_API_KEY'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const {
            topic,
            count = 10,
            difficulty = 'Hard',
            targetExam = 'UPSC CSE',
            existingQuestions = [],
        } = data;

        if (!topic || typeof topic !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'topic is required');
        }

        const uid = context.auth.uid;
        await checkAndIncrementRateLimit(uid, 'question_generation');

        const BATCH_SIZE = 10;
        const targetCount = Math.ceil(count * 1.5); // 50% overshoot to absorb dedup losses
        const numBatches = Math.ceil(targetCount / BATCH_SIZE);
        const allQuestions = [];
        const seenTexts = new Set(existingQuestions.map(t => (t || '').trim().toLowerCase()));

        const batchPromises = Array.from({ length: numBatches }, async (_, i) => {
            const batchSize = (i === numBatches - 1)
                ? targetCount - i * BATCH_SIZE
                : BATCH_SIZE;
            if (batchSize <= 0) return [];

            const typeInstruction = buildTypeDistributionInstruction(batchSize);
            const diffInstruction = buildDifficultyInstruction(batchSize, difficulty);
            const safeTopic = sanitizeForPrompt(topic);

            const prompt = `You are a strict Question Setter for ${targetExam}. Generate EXACTLY ${batchSize} MCQs on the topic: '${safeTopic}'.

RULES:
1. STRICT RELEVANCE: All questions MUST relate to '${safeTopic}'.
2. EXAM STYLE: Match ${targetExam} exam patterns.
3. UNIQUENESS: This is batch ${i + 1}. Do NOT repeat questions from other batches.
${diffInstruction}
${typeInstruction}
${THREE_LAYER_SOLUTION_INSTRUCTION}
${TAGGING_INSTRUCTION}

${existingQuestions.length > 0 ? `DO NOT duplicate or overlap with these existing question starts:\n${existingQuestions.slice(0, 20).join('\n')}` : ''}

OUTPUT: Return ONLY a valid JSON Array. No markdown. No extra text.

JSON FORMAT:
[
  {
    "text": "Full question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "difficultyLevel": "Hard",
    "questionType": "Assertion-Reasoning",
    "solution": {
      "correctAnswerReason": "Why this answer is correct...",
      "sourceOfQuestion": "NCERT / Article / Act reference...",
      "approachToSolve": "How to narrow down to the right option..."
    },
    "subjectCode": "IP",
    "topicCode": "03",
    "sourceCode": "SN",
    "typeCode": "CO",
    "difficultyCode": "TO",
    "pyqCode": "NA"
  }
]`;

            try {
                const responseText = await generateJSON(prompt, 'gemini-2.5-flash');
                const parsed = parseAIJsonResponse(responseText, 'array');
                return Array.isArray(parsed) ? parsed : [];
            } catch (err) {
                console.warn(`Batch ${i + 1} failed:`, err.message);
                return [];
            }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults
            .filter(r => r.status === 'fulfilled')
            .flatMap(r => r.value)
            .forEach((q, idx) => {
                const key = (q.text || '').trim().toLowerCase();
                if (!key || seenTexts.has(key) || !q.options || q.options.length < 2) return;
                seenTexts.add(key);
                allQuestions.push(normalizeQuestion(q, idx, { topic, difficulty, idPrefix: 'ai' }));
            });

        // Fill-up loop if short
        let fillRetries = 0;
        while (allQuestions.length < count && fillRetries < 5) {
            fillRetries++;
            const deficit = count - allQuestions.length;
            const fillSize = Math.min(Math.ceil(deficit * 1.2), 15);
            const existingSummary = allQuestions.slice(0, 20).map(q => (q.text || '').substring(0, 60)).join(' | ');
            const safeTopic = sanitizeForPrompt(topic);

            const fillPrompt = `Generate EXACTLY ${fillSize} NEW MCQs on '${safeTopic}'. This is a fill-up pass ${fillRetries}/5.
DO NOT repeat these already-generated questions:
${existingSummary}

${buildDifficultyInstruction(fillSize, difficulty)}
${buildTypeDistributionInstruction(fillSize)}
${THREE_LAYER_SOLUTION_INSTRUCTION}
${TAGGING_INSTRUCTION}

CRITICAL: Return ONLY a valid JSON Array.`;

            try {
                const fillText = await generateJSON(fillPrompt, 'gemini-2.5-flash');
                const fillParsed = parseAIJsonResponse(fillText, 'array');
                if (Array.isArray(fillParsed)) {
                    fillParsed.forEach((q, i) => {
                        if (allQuestions.length >= count) return;
                        const key = (q.text || '').trim().toLowerCase();
                        if (!key || seenTexts.has(key)) return;
                        seenTexts.add(key);
                        allQuestions.push(normalizeQuestion(q, i, { topic, difficulty, idPrefix: 'ai-fill' }));
                    });
                }
            } catch (err) {
                console.warn(`Fill-up ${fillRetries} failed:`, err.message);
            }
        }

        return { questions: allQuestions, requested: count, generated: allQuestions.length };
    });

// ─── 2. Generate Questions from Document (PDF) ────────────────────────────────

exports.geminiGenerateFromDocument = functions
    .runWith({ timeoutSeconds: 540, memory: '1GB', secrets: ['GEMINI_API_KEY'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const {
            documentText,
            documentTitle = 'Document',
            count = 10,
            difficulty = 'Hard',
            existingQuestions = [],
        } = data;

        if (!documentText || documentText.trim().length < 100) {
            throw new functions.https.HttpsError('invalid-argument', 'documentText is too short or missing');
        }

        const uid = context.auth.uid;
        await checkAndIncrementRateLimit(uid, 'question_generation');

        // Step 1: Topic identification
        let identifiedTopics = [];
        try {
            const topicPrompt = `Read this document excerpt and identify the top 3-5 primary academic topics/subjects it covers.
These topics should match UPSC/competitive exam syllabus areas.

DOCUMENT:
${documentText.substring(0, 3000)}

Return ONLY a JSON array of topic strings (max 5):
["Topic 1", "Topic 2", "Topic 3"]`;

            const topicText = await generateJSON(topicPrompt, 'gemini-2.5-flash');
            const parsed = parseAIJsonResponse(topicText, 'array');
            if (Array.isArray(parsed)) identifiedTopics = parsed;
        } catch (e) {
            console.warn('Topic identification failed:', e.message);
        }

        // Step 2: Chunk and generate
        const CHUNK_SIZE = 15000;
        const MAX_CHUNKS = 10;
        const textChunks = [];
        for (let i = 0; i < documentText.length && textChunks.length < MAX_CHUNKS; i += CHUNK_SIZE) {
            textChunks.push(documentText.substring(i, i + CHUNK_SIZE));
        }

        const BATCH_SIZE = 10;
        const numBatches = Math.ceil(count / BATCH_SIZE);
        const allGenerated = [];
        const seenTexts = new Set(existingQuestions.map(t => (t || '').trim().toLowerCase()));

        const batchPromises = Array.from({ length: numBatches }, async (_, index) => {
            const isLast = index === numBatches - 1;
            const targetQCount = isLast ? count - BATCH_SIZE * (numBatches - 1) : BATCH_SIZE;
            if (targetQCount <= 0) return [];

            const chunkIndex = index % textChunks.length;
            const chunk = textChunks[chunkIndex];
            const typeInstruction = buildTypeDistributionInstruction(targetQCount);
            const safeTitle = sanitizeForPrompt(documentTitle);

            const prompt = `You are an expert question generator for competitive exam preparation.
Based on the document chunk below, generate EXACTLY ${targetQCount} high-quality MCQs that test CONCEPTUAL UNDERSTANDING.

DOCUMENT TITLE: ${safeTitle}
IDENTIFIED TOPICS: ${identifiedTopics.join(', ') || 'General'}

DOCUMENT CHUNK (Part ${chunkIndex + 1} of ${textChunks.length}):
${chunk}

INSTRUCTIONS:
1. Go BEYOND surface text — test deeper understanding of concepts
2. Difficulty: ${difficulty}
${typeInstruction}
${THREE_LAYER_SOLUTION_INSTRUCTION}
${TAGGING_INSTRUCTION}

${existingQuestions.length > 0 ? `DO NOT duplicate:\n${existingQuestions.join('\n')}` : ''}

Return ONLY a valid JSON array of EXACTLY ${targetQCount} questions.
[{ "text": "...", "options": [...], "correctAnswer": 0, "difficultyLevel": "...", "questionType": "...", "topic": "...", "solution": {...}, "subjectCode": "...", "topicCode": "...", "sourceCode": "...", "typeCode": "...", "difficultyCode": "...", "pyqCode": "..." }]`;

            try {
                const responseText = await generateJSON(prompt, 'gemini-2.5-flash');
                const parsed = parseAIJsonResponse(responseText, 'array');
                return Array.isArray(parsed) ? parsed : [];
            } catch (err) {
                console.warn(`Document batch ${index + 1} failed:`, err.message);
                return [];
            }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.flat().forEach((q, idx) => {
            const key = (q.text || '').trim().toLowerCase();
            if (!key || seenTexts.has(key)) return;
            seenTexts.add(key);
            const safeTitle = (documentTitle || 'Document').substring(0, 30);
            allGenerated.push({
                ...normalizeQuestion(q, idx, { difficulty, idPrefix: 'doc' }),
                tags: q.tags || [
                    { type: 'source', label: `Document: ${safeTitle}` },
                    { type: 'difficulty', label: difficulty },
                    { type: 'topic', label: q.topic || identifiedTopics[0] || 'General' },
                ],
            });
        });

        // Fill-up if short
        let retryCount = 0;
        while (allGenerated.length < count && retryCount < 2) {
            retryCount++;
            const deficit = count - allGenerated.length;
            const existingSummary = allGenerated.slice(-20).map(q => (q.text || '').substring(0, 60)).join(' | ');
            const safe0 = textChunks[0].substring(0, 8000);

            const fillPrompt = `Generate EXACTLY ${Math.min(deficit, 15)} MORE unique ${difficulty} MCQs based on this document.
DO NOT repeat:\n${existingSummary}

DOCUMENT CONTENT:\n${safe0}

${buildTypeDistributionInstruction(Math.min(deficit, 15))}
${THREE_LAYER_SOLUTION_INSTRUCTION}
${TAGGING_INSTRUCTION}
Return ONLY a JSON Array.`;

            try {
                const fillText = await generateJSON(fillPrompt, 'gemini-2.5-flash');
                const fillParsed = parseAIJsonResponse(fillText, 'array');
                if (Array.isArray(fillParsed)) {
                    fillParsed.forEach((q, i) => {
                        const key = (q.text || '').trim().toLowerCase();
                        if (!key || seenTexts.has(key)) return;
                        seenTexts.add(key);
                        allGenerated.push(normalizeQuestion(q, i, { difficulty, idPrefix: 'doc-fill' }));
                    });
                }
            } catch (err) {
                console.warn('Fill-up round failed:', err.message);
            }
        }

        return {
            questions: allGenerated.slice(0, count),
            identifiedTopics,
            requested: count,
            generated: allGenerated.length,
        };
    });

// ─── 3. Evaluate Mains Answer ─────────────────────────────────────────────────

exports.geminiEvaluateAnswer = functions
    .runWith({ timeoutSeconds: 120, memory: '512MB', secrets: ['GEMINI_API_KEY'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { answerText } = data;
        if (!answerText || typeof answerText !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'answerText is required');
        }

        const uid = context.auth.uid;
        await checkAndIncrementRateLimit(uid, 'ai_evaluation');

        const safeAnswer = sanitizeForPrompt(answerText.substring(0, 5000));

        const prompt = `Act as a strict UPSC Mains Exam Evaluator. Evaluate the following answer for clarity, structure, and content depth.

Answer: '${safeAnswer}'

Provide output in strict JSON format.
Rules:
1. Be extremely crisp, pointed, and short. No fluff.
2. Use bullet points for readability.
3. Structure feedback into: Strengths, Weaknesses, and Improvements.

JSON Schema:
{
  "score": "X.X/10",
  "keywords": ["Top 3 key concepts used"],
  "missing": ["Critical missing points (max 3)"],
  "feedback": "### Strengths\\n- Point 1\\n\\n### Weaknesses\\n- Point 1\\n\\n### Improvement\\n- Actionable advice"
}`;

        try {
            const result = await generateJSON(prompt, 'gemini-2.5-flash');
            const parsed = parseAIJsonResponse(result, 'object');
            return parsed || {
                score: '6.5', keywords: ['Structure'], missing: ['Depth'],
                feedback: 'Good attempt. Add more specific examples and data.',
            };
        } catch (error) {
            console.error('Evaluation error:', error.message);
            return {
                score: '6.0', keywords: ['Basics'], missing: ['Depth'],
                feedback: 'Evaluation error. Please try again.',
            };
        }
    });

// ─── 4. Analyze Test Performance ─────────────────────────────────────────────

exports.geminiAnalyzePerformance = functions
    .runWith({ timeoutSeconds: 180, memory: '512MB', secrets: ['GEMINI_API_KEY'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { questions = [], answers = {} } = data;
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'questions array is required');
        }

        const uid = context.auth.uid;

        const incorrect = [], correct = [], skipped = [];
        questions.forEach((q, idx) => {
            const userVal = answers[q.id];
            const isSkipped = userVal === undefined || userVal === null;
            const isCorrect = !isSkipped && userVal === q.correctAnswer;
            const sol = q.solution || {};
            const entry = {
                n: idx + 1,
                text: (q.text || '').substring(0, 120),
                topic: q.topic || q.tags?.find(t => t.type === 'subTopic')?.label || q.tags?.find(t => t.type === 'subject')?.label || 'General',
                source: sol.sourceOfQuestion || '',
                reason: sol.correctAnswerReason || '',
            };
            if (isSkipped) skipped.push(entry);
            else if (isCorrect) correct.push(entry);
            else incorrect.push(entry);
        });

        const total = questions.length;
        const scorePercent = Math.round((correct.length / total) * 100);

        const prompt = `You are an expert UPSC coaching mentor. A student just completed a practice test. Analyze their performance and give specific, actionable feedback.

TEST SUMMARY:
- Total: ${total} | Correct: ${correct.length} | Incorrect: ${incorrect.length} | Skipped: ${skipped.length} | Score: ${scorePercent}%

QUESTIONS ANSWERED INCORRECTLY (${incorrect.length}):
${incorrect.map(q => `Q${q.n}: "${q.text}"\n  Topic: ${q.topic} | Source: ${q.source || 'N/A'}\n  Correct answer concept: ${q.reason || 'N/A'}`).join('\n\n') || 'None'}

QUESTIONS ANSWERED CORRECTLY (${correct.length}):
${correct.map(q => `Q${q.n}: Topic: ${q.topic}`).join(' | ') || 'None'}

SKIPPED (${skipped.length}):
${skipped.map(q => `Q${q.n}: Topic: ${q.topic}`).join(' | ') || 'None'}

Return ONLY this JSON (no markdown):
{
  "overallFeedback": "...",
  "personalizedFeedback": [
    { "concept": "Topic/concept name", "detail": "You struggled with X because... Focus on Y." }
  ],
  "topicsToStudy": [
    { "topic": "Topic name", "reason": "Why to study this" }
  ],
  "keyStrengths": ["Strength 1", "Strength 2"]
}`;

        try {
            const result = await generateJSON(prompt, 'gemini-2.5-flash');
            const parsed = parseAIJsonResponse(result, 'object');
            if (!parsed) throw new Error('Invalid response');
            return {
                overallFeedback: parsed.overallFeedback || '',
                personalizedFeedback: Array.isArray(parsed.personalizedFeedback) ? parsed.personalizedFeedback : [],
                topicsToStudy: Array.isArray(parsed.topicsToStudy) ? parsed.topicsToStudy : [],
                keyStrengths: Array.isArray(parsed.keyStrengths) ? parsed.keyStrengths : [],
                focusOn: (parsed.topicsToStudy || []).map(t => typeof t === 'string' ? t : `${t.topic} — ${t.reason}`),
                strengths: parsed.keyStrengths || [],
            };
        } catch (error) {
            console.error('Performance analysis error:', error.message);
            return {
                overallFeedback: 'AI analysis unavailable. Please review your answers below.',
                personalizedFeedback: [], topicsToStudy: [], keyStrengths: [],
                focusOn: ['Review your incorrect answers in the Question Review tab'],
                strengths: ['Attempting the test'],
            };
        }
    });

// ─── 5. Suggest Topics (autocomplete) ────────────────────────────────────────

exports.geminiSuggestTopics = functions
    .runWith({ timeoutSeconds: 30, memory: '256MB', secrets: ['GEMINI_API_KEY'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { keyword, targetExam = 'UPSC CSE' } = data;
        if (!keyword || keyword.trim().length < 2) {
            return { suggestions: [] };
        }

        const safeKeyword = sanitizeForPrompt(keyword.trim());

        const prompt = `You are an AI assistant helping a teacher create a ${targetExam} exam.
The teacher is typing a topic keyword: "${safeKeyword}".

Provide EXACTLY 5 highly relevant sub-topics from the UPSC/competitive exam syllabus that match or relate to "${safeKeyword}".
DO NOT invent random topics. Only suggest topics that are part of the standard competitive exam syllabus.

Output strictly as a JSON array of strings:
["Sub-topic 1", "Sub-topic 2", "Sub-topic 3", "Sub-topic 4", "Sub-topic 5"]`;

        try {
            const result = await generateJSON(prompt, 'gemini-2.5-flash');
            const parsed = parseAIJsonResponse(result, 'array');
            return { suggestions: Array.isArray(parsed) ? parsed.slice(0, 5) : [] };
        } catch (error) {
            console.error('Topic suggestion error:', error.message);
            return { suggestions: [] };
        }
    });

// ─── 6. Generate News Feed ────────────────────────────────────────────────────

exports.geminiGenerateNews = functions
    .runWith({ timeoutSeconds: 60, memory: '256MB', secrets: ['GEMINI_API_KEY'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const prompt = `Generate 6 critical Current Affairs headlines for UPSC Civil Services aspirants for today (${today}).
Focus on: Polity, Economy, Environment, Science & Tech, and International Relations.

Output strictly as a JSON array:
[
  {
    "id": 1,
    "title": "Headline (Max 10 words)",
    "summary": "Brief summary (Max 2 sentences).",
    "tag": "Subject (e.g., Economy)",
    "date": "Time ago (e.g., '2 Hours ago')"
  }
]`;

        try {
            const result = await generateJSON(prompt, 'gemini-2.5-flash');
            const parsed = parseAIJsonResponse(result, 'array');
            return { news: Array.isArray(parsed) ? parsed : [] };
        } catch (error) {
            console.error('News generation error:', error.message);
            return { news: [] };
        }
    });
