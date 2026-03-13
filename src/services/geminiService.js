import { delay } from '../utils/helpers';
import { getRandomSubtopic, UPSC_SYLLABUS } from '../constants/syllabusData';
import { AI_CONFIG } from '../constants/appConstants';
import logger from '../utils/logger';
import { db, auth } from './firebase'; // Import auth
import {
    collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp,
    doc, getDoc, setDoc, updateDoc, increment
} from 'firebase/firestore';

// ─── Rate Limiting Helper ───
const DAILY_LIMIT = 20;

async function checkAndIncrementRateLimit() {
    if (!auth.currentUser) return; // Allow guests? Or block? Assuming strict auth for 10k scale

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
 * @param {string} prompt - The prompt to send to Gemini
 * @param {boolean} isJson - Whether to expect JSON response
 * @param {string} model - The model to use (default: 'gemini-2.5-flash')
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
 * @returns {Promise<string|null>} Response text or null on failure
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
        // Check if already aborted before making request
        if (signal?.aborted) {
            throw new DOMException('Request aborted', 'AbortError');
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal, // Pass abort signal to fetch
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody.substring(0, 200)}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text;
        } catch (error) {
            // Don't retry if request was intentionally aborted
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

/**
 * Generate MCQ questions on a specific topic with batch support
 * @param {string} topic - Topic for question generation
 * @param {number} count - Number of questions to generate
 * @param {string} difficulty - Difficulty level (Easy, Intermediate, Hard)
 * @param {function} onProgress - Callback for progress updates (0-100)
 * @returns {Promise<Array|null>} Array of questions or null
 */
export async function generateQuestions(topic, count = 5, difficulty = 'Hard', targetExam = 'UPSC CSE', onProgress = () => { }) {
    // ─── 1. Check Shared Test Pool (Cache) ───
    try {
        const cacheRef = collection(db, 'cached_tests');
        const q = query(
            cacheRef,
            where('topic', '==', topic),
            where('difficulty', '==', difficulty),
            where('questionCount', '>=', count),
            orderBy('questionCount', 'desc'), // Prefer larger tests
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const cachedTest = snapshot.docs[0].data();
            logger.info(`Serving cached test for topic: ${topic}`);
            onProgress(100);
            // Return slice of questions (maybe shuffle in future)
            return cachedTest.questions.slice(0, count);
        }
    } catch (error) {
        logger.warn('Failed to check test cache:', error);
        // Continue to generation on error
    }

    // ─── 2. Generate via AI (Cache Miss) ───

    try {
        await checkAndIncrementRateLimit();
    } catch (error) {
        logger.error('Rate limit exceeded:', error);
        throw error; // Propagate to UI
    }

    const batches = Math.ceil(count / AI_CONFIG.BATCH_SIZE);
    let allQuestions = [];

    // Helper to generate a single batch
    const generateBatch = async (batchSize) => {
        // Advanced Syllabus Context Injection
        const context = getRandomSubtopic(topic);
        const subtopic = context ? context.subtopic : topic;

        const availableTopics = Object.entries(UPSC_SYLLABUS).map(([subject, data]) => {
            return `${subject}: ${data.subtopics.join(', ')}`;
        }).join('\n');

        const prompt = `You are a strict Question Setter for ${targetExam}. Generate ${batchSize} ${difficulty} MCQs STRICTLY on the requested theme/topic: '${topic}'${context ? ` (incorporating '${subtopic}' if relevant)` : ''}.
 
 Here is the strictly approved syllabus for the exam:
 ${availableTopics}
 
 Rules:
 1. **STRICT TEXT ADHERENCE**: The requested topic '${topic}' MUST fall under or relate to ONE OR MORE of the authorized subtopics in the approved syllabus above. Mixed subjects or "Full Mock Tests" covering multiple authorized subjects are ALLOWED and ENCOURAGED. If the topic is completely unrelated to the syllabus (e.g., 'Harry Potter' or 'Video Games'), you MUST return an empty array: []
 2. **EXAM STYLE**: Questions MUST follow the pattern of ${targetExam} (e.g., if target Exam is UPSC CSE -> Conceptual/Statement-based, if State PSC -> Factual/Direct).
 3. **Difficulty**: ${difficulty}. 
 4. **Output**: Return ONLY a JSON Array. NO markdown. NO "json" prefix.
 
 JSON Format (if valid):
 [
   {
     "text": "Question text...",
     "options": ["A", "B", "C", "D"],
     "correctAnswer": 0,
     "explanation": "Brief verification (1 sentence)"
   }
 ]`;

        try {
            const result = await callGemini(prompt, true);
            if (!result) return [];

            // Sanitize result: strip markdown code blocks
            let cleanResult = result.trim();
            if (cleanResult.startsWith('```')) {
                cleanResult = cleanResult.replace(/^```(json)?\n?/, '').replace(/```$/, '');
            }

            let questions = [];
            try {
                questions = JSON.parse(cleanResult);
            } catch (e) {
                // Fallback: Try access the array part if surrounded by text
                const arrayMatch = cleanResult.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    try {
                        questions = JSON.parse(arrayMatch[0]);
                    } catch (e2) {
                        return [];
                    }
                } else {
                    return [];
                }
            }

            if (!Array.isArray(questions)) return [];

            return questions.map((q, i) => ({
                id: Date.now() + i + Math.random().toString(36).substr(2, 9),
                topic,
                difficulty,
                ...q,
                correctAnswer: Number(q.correctAnswer) || 0
            }));
        } catch (error) {
            logger.error('Batch generation error:', error);
            return [];
        }
    };

    // Execute batches in parallel with partial success support
    const batchPromises = [];
    let completedBatches = 0;

    for (let i = 0; i < batches; i++) {
        const currentBatchSize = (i === batches - 1) ? (count - (i * AI_CONFIG.BATCH_SIZE)) : AI_CONFIG.BATCH_SIZE;
        if (currentBatchSize <= 0) continue;

        batchPromises.push((async () => {
            try {
                const batchQuestions = await generateBatch(currentBatchSize);

                // Update progress
                completedBatches++;
                const progress = Math.round((completedBatches / batches) * 100);
                onProgress(progress);

                if (!batchQuestions || batchQuestions.length === 0) return [];

                // Map batch to add IDs
                return batchQuestions.map((q, idx) => ({
                    ...q,
                    id: `ai-${Date.now()}-${i}-${idx}`,
                    tags: q.tags || [
                        { type: 'source', label: 'AI' },
                        { type: 'subject', label: 'General' },
                        { type: 'topic', label: topic },
                        { type: 'difficulty', label: difficulty }
                    ],
                    masteryStrikes: 0,
                }));
            } catch (error) {
                logger.error(`Batch ${i + 1} failed:`, error);
                // Update progress even on failure
                completedBatches++;
                const progress = Math.round((completedBatches / batches) * 100);
                onProgress(progress);
                return []; // Return empty array instead of throwing
            }
        })());
    }

    // Use allSettled to allow partial success
    const results = await Promise.allSettled(batchPromises);

    // Extract successful results
    const successfulBatches = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

    const failedBatches = results.filter(result => result.status === 'rejected').length;

    if (failedBatches > 0) {
        logger.warn(`${failedBatches} out of ${batches} batches failed. Proceeding with partial results.`);
    }

    allQuestions = successfulBatches.flat();

    // Filter out nulls/empty
    allQuestions = allQuestions.filter(q => q && q.text && q.options && q.options.length >= 2);

    // Deduplicate AI-generated questions (cross-batch dupes happen often)
    const seenTexts = new Set();
    allQuestions = allQuestions.filter(q => {
        const key = (q.text || '').trim().toLowerCase().substring(0, 100);
        if (key && seenTexts.has(key)) return false;
        if (key) seenTexts.add(key);
        return true;
    });

    if (allQuestions.length === 0) return null;
    return allQuestions;
}


/**
 * Evaluate a mains answer using AI
 * @param {string} answerText - The answer text to evaluate
 * @returns {Promise<object|null>} Evaluation result or null
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
  "feedback": "### Strengths\n- Point 1\n- Point 2\n\n### Weaknesses\n- Point 1\n\n### Improvement\n- Actionable advice"
}`;

    try {
        const result = await callGemini(prompt, true);

        if (!result) {
            // Return mock result for fallback
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
 * @param {Array} questions - The test questions
 * @param {object} answers - User answers {questionId: optionIndex}
 * @returns {Promise<object>} Analysis result
 */
export async function analyzeTestPerformance(questions, answers) {
    // Prepare a summary for the AI (avoid huge token usage)
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
 * @returns {boolean} True if API key is available
 */
export function isGeminiConfigured() {
    return Boolean(API_KEY);
}

/**
 * Generate current affairs news feed
 * @returns {Promise<Array>} Array of news items
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
 * Generate questions from extracted PDF/document content
 * @param {string} documentText - Extracted text from the document
 * @param {string} documentTitle - Title/name of the document
 * @param {number} count - Number of questions to generate
 * @param {string} difficulty - Difficulty level
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Array>} Array of question objects
 */
export async function generateQuestionsFromDocument(documentText, documentTitle = 'Document', count = 10, difficulty = 'Hard', onProgress = () => { }) {
    if (!documentText || documentText.trim().length < 100) {
        throw new Error('Document text is too short or empty');
    }

    onProgress(10);

    // Truncate very long documents to avoid token limits
    const maxChars = 10000;
    const truncatedText = documentText.length > maxChars
        ? documentText.substring(0, maxChars) + '...'
        : documentText;

    const prompt = `You are an expert question generator for exam preparation. Based on the following document content, generate exactly ${count} high-quality multiple-choice questions (MCQs).

DOCUMENT TITLE: ${documentTitle}

DOCUMENT CONTENT:
${truncatedText}

INSTRUCTIONS:
1. Generate questions that test understanding of the KEY CONCEPTS from the document
2. Questions should be factual and directly related to the content provided
3. Difficulty level: ${difficulty}
4. Each question must have exactly 4 options
5. Include diverse question types: factual recall, conceptual understanding, and application
6. Identify the main topics/subjects covered in the document for proper tagging

Return ONLY a valid JSON array with this exact structure:
[
  {
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this answer is correct",
    "topic": "Main topic from document (e.g., History, Science, Economics)",
    "tags": [
      { "type": "subject", "label": "Subject name" },
      { "type": "topic", "label": "Topic from document" },
      { "type": "difficulty", "label": "${difficulty}" },
      { "type": "source", "label": "Document: ${documentTitle.substring(0, 30)}" },
      { "type": "type", "label": "Conceptual or Factual" }
    ]
  }
]

Generate EXACTLY ${count} questions. Return ONLY the JSON array, no additional text.`;

    onProgress(30);

    try {
        const result = await callGemini(prompt, true);

        if (!result) {
            throw new Error('Failed to generate questions from document');
        }

        onProgress(70);

        // Parse and validate response
        let cleanResult = result.trim();
        if (cleanResult.startsWith('```json')) {
            cleanResult = cleanResult.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }

        let questions = [];
        try {
            questions = JSON.parse(cleanResult);
        } catch (parseError) {
            // Try to extract array from response
            const arrayMatch = cleanResult.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                questions = JSON.parse(arrayMatch[0]);
            } else {
                throw new Error('Invalid JSON response from AI');
            }
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('No questions generated from document');
        }

        onProgress(90);

        // Add IDs and ensure proper structure
        const processedQuestions = questions.map((q, idx) => ({
            ...q,
            id: `doc-${Date.now()}-${idx}`,
            tags: q.tags || [
                { type: 'source', label: `Document: ${documentTitle}` },
                { type: 'difficulty', label: difficulty },
                { type: 'topic', label: q.topic || 'General' }
            ],
            masteryStrikes: 0
        }));

        onProgress(100);

        return processedQuestions;
    } catch (error) {
        throw error;
    }
}

/**
 * Get real-time AI topic suggestions based on user input
 * @param {string} keyword - The partial topic the user is typing
 * @param {string} targetExam - The context exam (e.g., 'UPSC CSE')
 * @param {AbortSignal} [signal] - Optional AbortSignal for debouncing
 * @returns {Promise<Array<string>>} Array of suggested topics
 */
export async function suggestTestTopics(keyword, targetExam = 'UPSC CSE', signal = null) {
    if (!keyword || keyword.trim().length < 2) return [];

    // Serialize syllabus to feed to Gemini
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

        // Strip markdown if present
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


