import { delay } from '../utils/helpers';
import { getRandomSubtopic, UPSC_SYLLABUS } from '../constants/syllabusData';
import { AI_CONFIG } from '../constants/appConstants';
import logger from '../utils/logger';
import { db, auth } from './firebase';
import { PYQ_DATABASE } from '../constants/pyqDatabase';
import {
    collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp,
    doc, getDoc, setDoc, updateDoc, increment
} from 'firebase/firestore';

// ─── Rate Limiting Helper ───
const DAILY_LIMIT = 20;

async function checkAndIncrementRateLimit() {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, 'users', uid, 'api_usage', today);

    try {
        const snap = await getDoc(usageRef);

        if (snap.exists()) {
            const data = snap.data();
            if (data.test_generation >= DAILY_LIMIT) {
                throw new Error('Daily AI generation limit reached.');
            }
            await updateDoc(usageRef, { test_generation: increment(1) });
        } else {
            await setDoc(usageRef, { test_generation: 1 });
        }
    } catch (error) {
        logger.warn('Rate limit check failed:', error);
        if (error.message.includes('limit reached')) throw error;
    }
}

// API Configuration
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Make a request to Gemini API with retry logic and AbortController support
 */
export async function callGemini(prompt, isJson = false, model = 'gemini-2.5-flash', signal = null) {
    if (!API_KEY) {
        logger.warn("Gemini API Key missing. Returning null.");
        await delay(1000);
        return null;
    }

    const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
    };

    if (isJson) {
        payload.generationConfig = { responseMimeType: 'application/json' };
    }

    for (let attempt = 0; attempt < AI_CONFIG.MAX_RETRIES; attempt++) {
        if (signal?.aborted) {
            throw new DOMException('Request aborted', 'AbortError');
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal,
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody.substring(0, 200)}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text;
        } catch (error) {
            if (error.name === 'AbortError') {
                logger.info('Gemini API request aborted by user.');
                throw error;
            }

            logger.error(`Gemini API attempt ${attempt + 1}/${AI_CONFIG.MAX_RETRIES} failed:`, error);

            if (attempt === AI_CONFIG.MAX_RETRIES - 1) {
                throw error;
            }

            await delay(AI_CONFIG.RETRY_DELAYS[attempt]);
        }
    }

    return null;
}

// ─── Internal: Build the question-type distribution instruction ───
function buildTypeDistributionInstruction(batchSize) {
    const statement  = Math.round(batchSize * 0.45);
    const ar         = Math.round(batchSize * 0.25);
    const matching   = Math.round(batchSize * 0.20);
    const direct     = batchSize - statement - ar - matching; // remainder = direct factual

    return `
QUESTION TYPE DISTRIBUTION (strictly follow):
- ${statement} Statement-based questions (e.g., "Which of the following statements is/are correct?")
- ${ar} Assertion-Reasoning questions (Format: "Assertion (A): ... Reason (R): ..." with options like "Both A and R are correct and R is the correct explanation of A")
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

// ─── Internal: 3-layer solution schema instruction ───
const THREE_LAYER_SOLUTION_INSTRUCTION = `
SOLUTION FORMAT (mandatory for every question — 3 layers):
"solution": {
  "correctAnswerReason": "Concise explanation of WHY the correct option is correct (1-2 sentences)",
  "sourceOfQuestion": "Reference source: e.g., 'NCERT Class 12 History Ch.4', 'Economic Survey 2023', 'Article 370 of Indian Constitution'",
  "approachToSolve": "Strategy to eliminate wrong options and identify the correct answer (e.g., 'Use positive/negative elimination: options B and C are extreme statements...')"
}`;

/**
 * Generate MCQ questions on a specific topic with batch support.
 * Guarantees question-type diversity, 3-layer solutions, and exact count.
 */
export async function generateQuestions(topic, count = 5, difficulty = 'Hard', targetExam = 'UPSC CSE', onProgress = () => { }, existingQuestions = []) {
    // ─── 1. Check Shared Test Pool (Cache) — SKIP for large counts to avoid stale repetition ───
    if (count <= 25) {
        try {
            const cacheRef = collection(db, 'cached_tests');
            const q = query(
                cacheRef,
                where('topic', '==', topic),
                where('difficulty', '==', difficulty),
                where('questionCount', '>=', count),
                orderBy('questionCount', 'desc'),
                limit(5) // Fetch multiple to shuffle
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                // Pick random cached test to avoid always serving same questions
                const docs = snapshot.docs;
                const randomDoc = docs[Math.floor(Math.random() * docs.length)];
                const cachedTest = randomDoc.data();
                logger.info(`Serving cached test for topic: ${topic}`);
                onProgress(100);
                // Shuffle cached questions before returning to reduce perceived repetition
                const shuffled = [...cachedTest.questions].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, count);
            }
        } catch (error) {
            logger.warn('Failed to check test cache:', error);
        }
    }

    // ─── 2. Generate via AI (Cache Miss) ───
    try {
        await checkAndIncrementRateLimit();
    } catch (error) {
        logger.error('Rate limit exceeded:', error);
        throw error;
    }

    const availableTopics = Object.entries(UPSC_SYLLABUS).map(([subject, data]) => {
        return `${subject}: ${data.subtopics.join(', ')}`;
    }).join('\n');

    /**
     * Generate ONE batch, using a unique subtopic seed to prevent cross-batch repetition.
     */
    const generateBatch = async (batchSize, batchIndex, usedSubtopics = []) => {
        // Rotate subtopics to ensure each batch covers different ground
        const context = getRandomSubtopic(topic);
        let subtopic = context ? context.subtopic : topic;
        // Avoid reusing the same subtopic in consecutive batches
        let attempts = 0;
        while (usedSubtopics.includes(subtopic) && attempts < 5) {
            const freshCtx = getRandomSubtopic(topic);
            subtopic = freshCtx ? freshCtx.subtopic : topic;
            attempts++;
        }
        usedSubtopics.push(subtopic);

        const typeInstruction = buildTypeDistributionInstruction(batchSize);

        const prompt = `You are a strict Question Setter for ${targetExam}. Generate EXACTLY ${batchSize} ${difficulty} MCQs on the topic: '${topic}' (focus angle: '${subtopic}' for this batch).

APPROVED SYLLABUS:
${availableTopics}

RULES:
1. STRICT RELEVANCE: All questions MUST relate to '${topic}' within the approved syllabus.
2. EXAM STYLE: Match ${targetExam} exam patterns. UPSC CSE = conceptual/statement-based; State PSC = factual/direct.
3. UNIQUENESS: This is batch ${batchIndex + 1}. Do NOT repeat questions from other batches. Focus on '${subtopic}' angle.
4. DIFFICULTY: Each question MUST carry a self-assessed 'difficultyLevel' field ('Easy', 'Intermediate', or 'Hard').
${typeInstruction}
${THREE_LAYER_SOLUTION_INSTRUCTION}

${existingQuestions.length > 0 ? `DO NOT duplicate or overlap with these existing questions:\n${existingQuestions.join('\n')}` : ''}

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
    }
  }
]`;

        try {
            const result = await callGemini(prompt, true);
            if (!result) return [];

            let cleanResult = result.trim();
            if (cleanResult.startsWith('```')) {
                cleanResult = cleanResult.replace(/^```(json)?\n?/, '').replace(/```$/, '');
            }

            let questions = [];
            try {
                questions = JSON.parse(cleanResult);
            } catch (e) {
                const arrayMatch = cleanResult.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    try { questions = JSON.parse(arrayMatch[0]); } catch (e2) { return []; }
                } else {
                    return [];
                }
            }

            if (!Array.isArray(questions)) return [];

            return questions.map((q, i) => ({
                id: `ai-${Date.now()}-${batchIndex}-${i}`,
                topic,
                difficulty: q.difficultyLevel || difficulty,
                questionType: q.questionType || 'Statement-based',
                ...q,
                correctAnswer: Number(q.correctAnswer) || 0,
                // Ensure solution is always present
                solution: q.solution || {
                    correctAnswerReason: q.explanation || '',
                    sourceOfQuestion: 'General Knowledge',
                    approachToSolve: 'Eliminate incorrect options systematically.'
                },
                // Keep legacy explanation field for backward compat
                explanation: q.solution?.correctAnswerReason || q.explanation || ''
            }));
        } catch (error) {
            logger.error(`Batch ${batchIndex} generation error:`, error);
            return [];
        }
    };

    const batches = Math.ceil(count / AI_CONFIG.BATCH_SIZE);
    const usedSubtopics = [];
    let allQuestions = [];
    let completedBatches = 0;

    // Execute batches in parallel
    const batchPromises = [];
    for (let i = 0; i < batches; i++) {
        const currentBatchSize = (i === batches - 1)
            ? (count - (i * AI_CONFIG.BATCH_SIZE))
            : AI_CONFIG.BATCH_SIZE;
        if (currentBatchSize <= 0) continue;

        batchPromises.push((async () => {
            try {
                const batchQuestions = await generateBatch(currentBatchSize, i, usedSubtopics);
                completedBatches++;
                onProgress(Math.round((completedBatches / batches) * 85)); // Up to 85%; fill-up is last 15%
                return batchQuestions || [];
            } catch (error) {
                logger.error(`Batch ${i + 1} failed:`, error);
                completedBatches++;
                onProgress(Math.round((completedBatches / batches) * 85));
                return [];
            }
        })());
    }

    const results = await Promise.allSettled(batchPromises);
    allQuestions = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);

    // ─── 3. Deduplicate (text-based) ───
    const seenTexts = new Set(existingQuestions.map(t => t.trim().toLowerCase()));
    allQuestions = allQuestions.filter(q => {
        const key = (q.text || '').trim().toLowerCase();
        if (!key || seenTexts.has(key)) return false;
        seenTexts.add(key);
        return true;
    }).filter(q => q && q.text && q.options && q.options.length >= 2);

    // ─── 4. Fill-up: If we're short, request the deficit in extra batches ───
    let fillRetries = 0;
    while (allQuestions.length < count && fillRetries < 2) {
        fillRetries++;
        const deficit = count - allQuestions.length;
        logger.warn(`Fill-up needed: got ${allQuestions.length}/${count}. Requesting ${deficit} more.`);

        const existingSummary = allQuestions.slice(0, 15).map(q =>
            (q.text || '').substring(0, 60)
        ).join(' | ');

        const fillPrompt = `You are a Question Setter for ${targetExam}. Generate EXACTLY ${deficit} ${difficulty} MCQs on '${topic}'.

These questions have ALREADY been generated (DO NOT REPEAT them):
${existingSummary}

${buildTypeDistributionInstruction(deficit)}
${THREE_LAYER_SOLUTION_INSTRUCTION}

RULES: Strictly unique questions. Return ONLY a valid JSON Array (same format as before).`;

        try {
            const fillResult = await callGemini(fillPrompt, true);
            if (fillResult) {
                let fillClean = fillResult.trim().replace(/^```(json)?\n?/, '').replace(/```$/, '');
                let fillQuestions = [];
                try { fillQuestions = JSON.parse(fillClean); } catch {
                    const m = fillClean.match(/\[[\s\S]*\]/);
                    if (m) try { fillQuestions = JSON.parse(m[0]); } catch { /* ignore */ }
                }
                if (Array.isArray(fillQuestions)) {
                    fillQuestions.forEach((q, i) => {
                        const key = (q.text || '').trim().toLowerCase();
                        if (!key || seenTexts.has(key)) return;
                        seenTexts.add(key);
                        allQuestions.push({
                            id: `ai-${Date.now()}-fillup-${fillRetries}-${i}`,
                            topic,
                            difficulty: q.difficultyLevel || difficulty,
                            questionType: q.questionType || 'Direct Factual',
                            ...q,
                            correctAnswer: Number(q.correctAnswer) || 0,
                            solution: q.solution || {
                                correctAnswerReason: q.explanation || '',
                                sourceOfQuestion: 'General Knowledge',
                                approachToSolve: 'Eliminate incorrect options systematically.'
                            },
                            explanation: q.solution?.correctAnswerReason || q.explanation || ''
                        });
                    });
                }
            }
        } catch (fillError) {
            logger.warn('Fill-up batch failed:', fillError);
            break;
        }
    }

    onProgress(100);

    if (allQuestions.length === 0) return null;
    return allQuestions.slice(0, count); // Never exceed requested count
}


/**
 * Evaluate a mains answer using AI
 */
export async function evaluateAnswer(answerText) {
    const prompt = `Act as a strict UPSC Mains Exam Evaluator. Evaluate the following answer for clarity, structure, and content depth.

Answer: '${answerText}'

Provide output in strict JSON format.
Rules for Feedback:
1. Be extremely crisp, pointed, and short. No fluff.
2. Use bullet points for readability.
3. Structure feedback into: Strengths, Weaknesses, and Improvements.

JSON Schema:
{
  "score": "X.X/10",
  "keywords": ["Top 3 key concepts used"],
  "missing": ["Critical missing points (max 3)"],
  "feedback": "### Strengths\\n- Point 1\\n- Point 2\\n\\n### Weaknesses\\n- Point 1\\n\\n### Improvement\\n- Actionable advice"
}`;

    try {
        const result = await callGemini(prompt, true);

        if (!result) {
            return {
                score: '6.5',
                keywords: ['Structure', 'Flow'],
                missing: ['Data', 'Examples'],
                feedback: 'Good attempt. Consider adding more specific examples and data points.',
            };
        }

        return JSON.parse(result);
    } catch (error) {
        logger.error('Error evaluating answer:', error);
        return {
            score: '6.0',
            keywords: ['Basics'],
            missing: ['Depth'],
            feedback: 'Evaluation error occurred. Please try again.',
        };
    }
}

/**
 * Analyze test performance using AI
 */
export async function analyzeTestPerformance(questions, answers) {
    const summary = questions.map((q, idx) => {
        const userVal = answers[q.id];
        const isCorrect = userVal === q.correctAnswer;
        const skipped = userVal === undefined;
        return {
            id: idx + 1,
            tags: q.tags || [],
            result: skipped ? 'Skipped' : (isCorrect ? 'Correct' : 'Incorrect')
        };
    });

    const prompt = `Analyze this test performance for a UPSC aspirant.
    
    Data: ${JSON.stringify(summary)}
    
    Provide a strategic analysis in JSON format:
    {
      "strengths": ["Strong area 1", "Strong area 2"],
      "weaknesses": ["Weak area 1", "Weak area 2"],
      "focusOn": ["High priority topic to study 1", "High priority topic to study 2"],
      "notFocusOn": ["Topic already mastered / Low priority 1", "Topic not needed right now 2"],
      "overallFeedback": "2-3 sentences of encouraging but critical feedback."
    }`;

    try {
        const result = await callGemini(prompt, true);
        if (!result) throw new Error("No AI response");
        return JSON.parse(result);
    } catch (error) {
        logger.error("Analysis Error:", error);
        return {
            strengths: ["Consistency"],
            weaknesses: ["Analysis failed"],
            focusOn: ["Review incorrect answers manually"],
            notFocusOn: ["N/A"],
            overallFeedback: "AI analysis unavailable at the moment. Please review the detailed question breakdown below."
        };
    }
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured() {
    return Boolean(API_KEY);
}

/**
 * Generate current affairs news feed
 */
export async function generateNews() {
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
        const result = await callGemini(prompt, true);
        if (!result) return [];
        let news = JSON.parse(result);
        return Array.isArray(news) ? news : [];
    } catch (error) {
        logger.error("News generation error:", error);
        return [];
    }
}

/**
 * Generate questions from extracted PDF/document content.
 * Includes: topic identification, question-type diversity, 3-layer solution, PYQ blending.
 */
export async function generateQuestionsFromDocument(documentText, documentTitle = 'Document', count = 10, difficulty = 'Hard', onProgress = () => { }, existingQuestions = []) {
    if (!documentText || documentText.trim().length < 100) {
        throw new Error('Document text is too short or empty');
    }

    onProgress(5);

    // ─── Step 1: Topic Identification ───
    // Quick pass to identify the primary topics in the document
    const maxChars = 15000;
    const truncatedText = documentText.length > maxChars
        ? documentText.substring(0, maxChars) + '...'
        : documentText;

    let identifiedTopics = [];
    try {
        const topicPrompt = `Read this document excerpt and identify the top 3-5 primary academic topics/subjects it covers.
These topics should match UPSC/competitive exam syllabus areas.

DOCUMENT:
${truncatedText.substring(0, 3000)}

Return ONLY a JSON array of topic strings (max 5):
["Topic 1", "Topic 2", "Topic 3"]`;

        const topicResult = await callGemini(topicPrompt, true);
        if (topicResult) {
            let cleaned = topicResult.trim().replace(/^```(json)?\n?/, '').replace(/```$/, '');
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) identifiedTopics = parsed;
        }
    } catch (e) {
        logger.warn('Topic identification failed, proceeding without it:', e);
    }

    onProgress(20);

    // ─── Step 2: Ensure all questions are document-based (No PYQ blending) ───
    const aiCount = count;
    const pyqCount = 0;

    const typeInstruction = buildTypeDistributionInstruction(aiCount);

    // ─── Step 3: Chunk Document and Generate in Parallel ───
    const CHUNK_SIZE = 15000;
    const textChunks = [];
    // Only take up to 10 chunks (150k chars max) to avoid out-of-memory/too many requests
    const maxChunks = 10;
    
    for (let i = 0; i < documentText.length && textChunks.length < maxChunks; i += CHUNK_SIZE) {
        textChunks.push(documentText.substring(i, i + CHUNK_SIZE));
    }

    const docQCount = aiCount;
    const BATCH_SIZE = AI_CONFIG?.BATCH_SIZE || 10;
    const batches = Math.ceil(docQCount / BATCH_SIZE);
    
    let allGeneratedQuestions = [];
    const seenTexts = new Set();
    let completedBatches = 0;

    onProgress(35);

    // Run AI requests concurrently across batches, distributing chunks
    const batchPromises = Array.from({ length: batches }).map(async (_, index) => {
        // Distribute the exact number of questions needed
        const isLastBatch = index === batches - 1;
        const targetQCount = isLastBatch 
            ? docQCount - (BATCH_SIZE * (batches - 1)) 
            : BATCH_SIZE;

        if (targetQCount <= 0) return [];

        // Assign a chunk to this batch round-robin style
        const chunkIndex = index % textChunks.length;
        const chunk = textChunks[chunkIndex];

        const typeInstruction = buildTypeDistributionInstruction(targetQCount);

        const documentPrompt = `You are an expert question generator for competitive exam preparation.
Based on the specific document chunk below, generate EXACTLY ${targetQCount} high-quality MCQs that test CONCEPTUAL UNDERSTANDING — NOT just literal content recall.

DOCUMENT TITLE: ${documentTitle}
IDENTIFIED TOPICS: ${identifiedTopics.join(', ') || 'General'}

DOCUMENT CHUNK (Part ${chunkIndex + 1} of ${textChunks.length}):
${chunk}

INSTRUCTIONS:
1. Go BEYOND the text: use the document as a context clue to generate exam-relevant questions on the identified topics
2. Difficulty: ${difficulty}
3. Avoid questions that just ask "which statement matches the text" — test deeper understanding
${typeInstruction}
${THREE_LAYER_SOLUTION_INSTRUCTION}

${existingQuestions.length > 0 ? `DO NOT duplicate or overlap with these existing questions:\n${existingQuestions.join('\n')}` : ''}

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
      "sourceOfQuestion": "Document / NCERT / Standard reference",
      "approachToSolve": "..."
    }
  }
]

Generate EXACTLY ${targetQCount} unique questions. Return ONLY the JSON array.`;

        try {
            const result = await callGemini(documentPrompt, true);
            if (!result) return [];

            let cleanResult = result.trim();
            if (cleanResult.startsWith('```json')) {
                cleanResult = cleanResult.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }

            let parsed = [];
            try {
                parsed = JSON.parse(cleanResult);
            } catch {
                const arrayMatch = cleanResult.match(/\[[\s\S]*\]/);
                if (arrayMatch) parsed = JSON.parse(arrayMatch[0]);
            }

            completedBatches++;
            const currentProgress = 35 + Math.round((completedBatches / batches) * 45);
            onProgress(currentProgress);

            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            logger.warn(`Batch ${index + 1} generation failed:`, err);
            return [];
        }
    });

    const batchResults = await Promise.all(batchPromises);
    
    // Flatten and deduplicate
    batchResults.flat().forEach(q => {
        const key = (q.text || '').trim().toLowerCase();
        if (key && !seenTexts.has(key)) {
            seenTexts.add(key);
            allGeneratedQuestions.push(q);
        }
    });

    // ─── Step 4: Final Fill-up Sequence if short ───
    let retryCount = 0;
    while (allGeneratedQuestions.length < aiCount && retryCount < 2) {
        retryCount++;
        const deficit = aiCount - allGeneratedQuestions.length;
        const currentBatchSize = Math.min(deficit, 15);
        const existingSummary = allGeneratedQuestions.slice(-20).map(q => (q.text || '').substring(0, 60)).join(' | ');

        // Fallback to first chunk for fill-up
        const fillPrompt = `Generate EXACTLY ${currentBatchSize} MORE unique ${difficulty} MCQs based on this document.
DO NOT repeat these questions (already generated):
${existingSummary}

DOCUMENT CONTENT:
${textChunks[0].substring(0, 8000)}

${buildTypeDistributionInstruction(currentBatchSize)}
${THREE_LAYER_SOLUTION_INSTRUCTION}

Return ONLY a JSON Array (same format as before).`;

        try {
            const fillResult = await callGemini(fillPrompt, true);
            if (!fillResult) continue;

            let cleanResult = fillResult.trim();
            if (cleanResult.startsWith('```json')) {
                cleanResult = cleanResult.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }

            let parsed = [];
            try {
                parsed = JSON.parse(cleanResult);
            } catch {
                const arrayMatch = cleanResult.match(/\[[\s\S]*\]/);
                if (arrayMatch) parsed = JSON.parse(arrayMatch[0]);
            }

            if (Array.isArray(parsed)) {
                parsed.forEach(q => {
                    const key = (q.text || '').trim().toLowerCase();
                    if (key && !seenTexts.has(key)) {
                        seenTexts.add(key);
                        allGeneratedQuestions.push(q);
                    }
                });
            }
        } catch (err) {
            logger.warn('Fill-up round failed:', err);
        }
    }

    let aiQuestions = [];
    try {
        if (allGeneratedQuestions.length === 0) throw new Error('No questions generated');

        aiQuestions = allGeneratedQuestions.slice(0, aiCount).map((q, idx) => ({
            ...q,
            id: `doc-${Date.now()}-${idx}`,
            difficulty: q.difficultyLevel || difficulty,
            questionType: q.questionType || 'Conceptual',
            solution: q.solution || {
                correctAnswerReason: q.explanation || '',
                sourceOfQuestion: `Document: ${documentTitle}`,
                approachToSolve: 'Identify key concepts from the document context.'
            },
            explanation: q.solution?.correctAnswerReason || q.explanation || '',
            tags: q.tags || [
                { type: 'source', label: `Document: ${documentTitle.substring(0, 30)}` },
                { type: 'difficulty', label: difficulty },
                { type: 'topic', label: q.topic || identifiedTopics[0] || 'General' }
            ],
            masteryStrikes: 0
        }));
    } catch (error) {
        logger.error('Document question generation error:', error);
        aiQuestions = [];
    }

    onProgress(80);

    // ─── Step 4: Blend topic-matched PYQs ───
    let pyqQuestions = [];
    if (pyqCount > 0 && identifiedTopics.length > 0) {
        try {
            // Match PYQs against identified topics
            let matchedPYQs = PYQ_DATABASE.filter(q =>
                identifiedTopics.some(t =>
                    (q.subject || '').toLowerCase().includes(t.toLowerCase()) ||
                    (q.topic || '').toLowerCase().includes(t.toLowerCase())
                )
            );

            // Fallback: topic from document title
            if (matchedPYQs.length < pyqCount) {
                const titleWords = documentTitle.toLowerCase().split(/\s+/);
                const titleMatched = PYQ_DATABASE.filter(q =>
                    titleWords.some(w => w.length > 3 &&
                        ((q.subject || '').toLowerCase().includes(w) ||
                         (q.topic || '').toLowerCase().includes(w))
                    )
                );
                // Merge without duplicates
                const existingIds = new Set(matchedPYQs.map(q => q.id));
                matchedPYQs = [...matchedPYQs, ...titleMatched.filter(q => !existingIds.has(q.id))];
            }

            if (matchedPYQs.length > 0) {
                pyqQuestions = matchedPYQs
                    .sort(() => Math.random() - 0.5)
                    .slice(0, pyqCount)
                    .map(q => ({
                        ...q,
                        solution: q.solution || {
                            correctAnswerReason: q.explanation || '',
                            sourceOfQuestion: q.year ? `PYQ ${q.year}` : 'Previous Year Question',
                            approachToSolve: 'This is a previous year question — recognizing the pattern helps.'
                        },
                        explanation: q.solution?.correctAnswerReason || q.explanation || ''
                    }));
            }
        } catch (e) {
            logger.warn('PYQ blending failed:', e);
        }
    }

    onProgress(95);

    // ─── Step 5: Merge, deduplicate, and return ───
    const combined = [...aiQuestions, ...pyqQuestions];
    const finalSeenTexts = new Set();
    const final = combined.filter(q => {
        const key = (q.text || '').trim().toLowerCase().substring(0, 100);
        if (!key || finalSeenTexts.has(key)) return false;
        finalSeenTexts.add(key);
        return true;
    }).slice(0, count);

    onProgress(100);
    return final;
}

/**
 * Get real-time AI topic suggestions based on user input
 */
export async function suggestTestTopics(keyword, targetExam = 'UPSC CSE', signal = null) {
    if (!keyword || keyword.trim().length < 2) return [];

    const availableTopics = Object.entries(UPSC_SYLLABUS).map(([subject, data]) => {
        return `${subject}: ${data.subtopics.join(', ')}`;
    }).join('\n');

    const prompt = `You are an AI assistant helping a teacher create a ${targetExam} exam.
    The teacher is typing a topic keyword: "${keyword}".
    
    Here is the STRICT, APPROVED syllabus:
    ${availableTopics}
    
    Provide EXACTLY 5 highly relevant sub-topics from the APPROVED syllabus above that match or relate to "${keyword}".
    DO NOT invent new topics. ONLY use the exact sub-topics listed in the syllabus above.
    
    Output strictly as a JSON array of strings:
    ["Sub-topic 1", "Sub-topic 2", "Sub-topic 3", "Sub-topic 4", "Sub-topic 5"]`;

    try {
        const result = await callGemini(prompt, true, 'gemini-2.5-flash', signal);
        if (!result) return [];

        let cleanResult = result.trim();
        if (cleanResult.startsWith('\`\`\`')) {
            cleanResult = cleanResult.replace(/^\`\`\`(json)?\n?/, '').replace(/\`\`\`$/, '');
        }

        const suggestions = JSON.parse(cleanResult);
        return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
    } catch (error) {
        if (error.name !== 'AbortError') {
            logger.error("Topic suggestion error:", error);
        }
        return [];
    }
}
