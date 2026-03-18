/**
 * Test Generation & Submission Cloud Functions
 * SEC-1: Server-side question storage — answers never exposed to client
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { checkAndIncrementRateLimit } = require('./rateLimit');
const crypto = require('crypto');

const genAI = new GoogleGenerativeAI(functions.config().gemini?.api_key || process.env.GEMINI_API_KEY || '');

function hashText(text) {
    if (!text) return '';
    return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

// ─── Question Bank Tagging Helpers (texr spec) ────────────────────────────────

const SUBJECT_CODES = {
    'Indian Polity': 'IP', 'Ancient and Medieval History': 'AM', 'Modern India': 'MI',
    'Indian Culture': 'IC', 'Geography': 'GE', 'Economy of India': 'EI',
    'Environment': 'EN', 'Science and Technology': 'ST', 'Current Affairs': 'CA', 'Trivial': 'TR',
};

const SOURCE_CODES     = { Standard: 'SN', Advanced: 'AD', Random: 'RN', 'Current Issue': 'CI', 'Not Applicable': 'NA' };
const QTYPE_CODES      = { Factual: 'FA', Conceptual: 'CO', 'Application Based': 'AB', Definition: 'DE', Informative: 'IN' };
const DIFFICULTY_MAP   = { Hard: 'TO', Intermediate: 'ME', Easy: 'ES' };
const PYQ_CODES        = { CSE: 'CS', CDSE: 'CD', NDA: 'ND', CISF: 'CI', CAPF: 'CP', 'Not Applicable': 'NA' };

function resolveSubjectCode(topic) {
    const lower = (topic || '').toLowerCase();
    const found = Object.entries(SUBJECT_CODES).find(([name]) =>
        lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)
    );
    return found ? found[1] : 'TR';
}

/** Build 16-char question ID: AA-00-BB-CC-DD-EE-0000 */
function makeQuestionId(subCode, topicCode, srcCode, typeCode, diffCode, pyqCode, serial) {
    return `${subCode}-${String(topicCode).padStart(2,'0')}-${srcCode}-${typeCode}-${diffCode}-${pyqCode}-${String(serial).padStart(4,'0')}`;
}

/** Increment Firestore serial counter for a subject-topic block, return next value */
async function getNextSerial(subjectCode, topicCode) {
    const counterId = `${subjectCode}-${String(topicCode).padStart(2,'0')}`;
    const ref = admin.firestore().collection('tag_counters').doc(counterId);
    try {
        const result = await admin.firestore().runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            const next = doc.exists ? (doc.data().count || 0) + 1 : 1;
            tx.set(ref, { count: next }, { merge: true });
            return next;
        });
        return result;
    } catch {
        return Math.floor(Math.random() * 9000) + 1000; // fallback: random 4-digit
    }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Build question-type distribution instruction for a given batch size.
 * Mirrors UPSC/competitive exam paper patterns.
 */
function buildTypeDistributionInstruction(batchSize) {
    const statement   = Math.round(batchSize * 0.45);
    const ar          = Math.round(batchSize * 0.25);
    const matching    = Math.round(batchSize * 0.20);
    const direct      = batchSize - statement - ar - matching;

    return `
QUESTION TYPE DISTRIBUTION (strictly follow for this batch):
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

/** 3-layer solution instruction injected into every prompt. */
const THREE_LAYER_SOLUTION_INSTRUCTION = `
SOLUTION FORMAT (mandatory for EVERY question):
"solution": {
  "correctAnswerReason": "Concise explanation of WHY the correct option is correct (1-2 sentences)",
  "sourceOfQuestion": "Reference: e.g., 'NCERT Class 12 History Ch.4', 'Article 370', 'Economic Survey 2023'",
  "approachToSolve": "Strategy to eliminate wrong options and identify the correct answer"
}
`;

/** Tagging instruction injected into every prompt so AI self-classifies each question. */
const TAGGING_INSTRUCTION = `
TAGGING FIELDS (mandatory for EVERY question — use the exact codes below):
"subjectCode": one of [IP, AM, MI, IC, GE, EI, EN, ST, CA, TR]
"topicCode":   2-digit string e.g. "02" (best matching sub-topic number within the subject)
"sourceCode":  one of [SN=Standard/NCERT, AD=Advanced/official-docs, CI=Current-Issue, RN=Random, NA=Not-Applicable]
"typeCode":    one of [FA=Factual, CO=Conceptual, AB=Application-Based, DE=Definition, IN=Informative]
"difficultyCode": one of [ET=Extreme-Tough, TO=Tough, ME=Medium, ES=Easy, FO=Foundational]
"pyqCode":     one of [CS=CSE, CD=CDSE, ND=NDA, CI=CISF, CP=CAPF, NA=Not-Applicable]
`;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a test — questions with answers stored server-side only.
 * Returns sanitized questions (no correct answers) to the client.
 */
exports.generateTest = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { topic, questionCount = 10, difficulty = 'Hard' } = data;
    const userId = context.auth.uid;

    if (!topic || typeof topic !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Topic is required');
    }

    if (questionCount < 1 || questionCount > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Question count must be 1-100');
    }

    let questions = null;
    let fromCache = false;

    // 1. Try cache — only for small tests (≤25) to reduce stale repetition
    if (questionCount <= 25) {
        try {
            const cacheSnapshot = await admin.firestore().collection('cached_tests')
                .where('topic', '==', topic)
                .where('difficulty', '==', difficulty)
                .where('questionCount', '==', questionCount)
                .limit(10) // Fetch a pool to randomize
                .get();

            if (!cacheSnapshot.empty) {
                // Pick a random test from cache to avoid repetition
                const randomDoc = cacheSnapshot.docs[Math.floor(Math.random() * cacheSnapshot.size)];
                questions = randomDoc.data().questions;
                // Shuffle cached questions
                questions = questions.sort(() => Math.random() - 0.5);
                fromCache = true;
                console.log(`Serving cached test for topic: ${topic}`);
            }
        } catch (error) {
            console.error('Cache read error:', error);
        }
    }

    // 2. Generate via Gemini if not cached
    if (!questions) {
        await checkAndIncrementRateLimit(userId, 'test_generation');

        const typeInstruction = buildTypeDistributionInstruction(questionCount);

        const prompt = `You are a strict Question Setter for UPSC/Competitive Exams. Generate EXACTLY ${questionCount} ${difficulty} MCQs on the topic: '${topic}'.

RULES:
1. Questions MUST be 100% relevant to '${topic}'.
2. Difficulty: ${difficulty}.
3. Each question must include a self-assessed 'difficultyLevel' field ('Easy', 'Intermediate', or 'Hard').
${typeInstruction}
${THREE_LAYER_SOLUTION_INSTRUCTION}
${TAGGING_INSTRUCTION}

OUTPUT: Return ONLY a JSON Array. NO markdown. NO extra text.

JSON FORMAT:
[
  {
    "text": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "difficultyLevel": "Hard",
    "questionType": "Assertion-Reasoning",
    "solution": {
      "correctAnswerReason": "...",
      "sourceOfQuestion": "...",
      "approachToSolve": "..."
    },
    "subjectCode": "IP",
    "topicCode": "02",
    "sourceCode": "SN",
    "typeCode": "FA",
    "difficultyCode": "ME",
    "pyqCode": "NA"
  }
]`;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            });

            const responseText = result.response.text();
            try {
                questions = JSON.parse(responseText);
            } catch {
                const arrayMatch = responseText.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    questions = JSON.parse(arrayMatch[0]);
                } else {
                    throw new functions.https.HttpsError('internal', 'Failed to parse AI response');
                }
            }

            if (!Array.isArray(questions) || questions.length === 0) {
                throw new functions.https.HttpsError('internal', 'No questions generated');
            }

            // Deduplicate first before fill-up check
            const seenTexts = new Set();
            questions = questions.filter(q => {
                const key = (q.text || '').trim().toLowerCase();
                if (!key || seenTexts.has(key)) return false;
                seenTexts.add(key);
                return true;
            });

            // 2a. Fill-up if AI returned fewer than requested
            let fillRetries = 0;
            while (questions.length < questionCount && fillRetries < 2) {
                fillRetries++;
                const deficit = questionCount - questions.length;
                const existingSummary = questions.slice(0, 15).map(q => (q.text || '').substring(0, 60)).join(' | ');
                const fillPrompt = `You are a Question Setter. Generate EXACTLY ${deficit} MORE unique ${difficulty} MCQs on '${topic}'.
DO NOT repeat these questions (already generated):
${existingSummary}

${buildTypeDistributionInstruction(deficit)}
${THREE_LAYER_SOLUTION_INSTRUCTION}

Return ONLY a JSON Array (same format as before).`;

                try {
                    const fillResult = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: fillPrompt }] }],
                        generationConfig: { responseMimeType: 'application/json' }
                    });
                    const fillText = fillResult.response.text();
                    let fillQuestions = [];
                    try { fillQuestions = JSON.parse(fillText); } catch {
                        const m = fillText.match(/\[[\s\S]*\]/);
                        if (m) fillQuestions = JSON.parse(m[0]);
                    }
                    if (Array.isArray(fillQuestions)) {
                        fillQuestions.forEach(q => {
                            const key = (q.text || '').trim().toLowerCase();
                            if (!key || seenTexts.has(key)) return;
                            seenTexts.add(key);
                            questions.push(q);
                        });
                    }
                } catch (fillErr) {
                    console.warn('Fill-up batch failed:', fillErr);
                    break;
                }
            }

            // Add IDs, tags, normalise solution — and assign structured question IDs
            const subjectCode = resolveSubjectCode(topic);
            const taggedQuestions = await Promise.all(questions.map(async (q, idx) => {
                // Use AI-provided codes if present and valid, else derive from topic
                const topicCodeRaw  = q.topicCode  || '01';
                const sourceCode    = SOURCE_CODES[q.sourceCode]  ? q.sourceCode  : (SOURCE_CODES['Standard']);
                const typeCode      = QTYPE_CODES[q.typeCode]     ? q.typeCode    : 'FA';
                const diffCode      = q.difficultyCode || DIFFICULTY_MAP[q.difficultyLevel || difficulty] || 'ME';
                const pyqCode       = PYQ_CODES[q.pyqCode]        ? q.pyqCode     : 'NA';

                const serial = await getNextSerial(subjectCode, topicCodeRaw);
                const questionId = makeQuestionId(subjectCode, topicCodeRaw, sourceCode, typeCode, diffCode, pyqCode, serial);

                return {
                    ...q,
                    id: questionId,          // Use structured ID as primary ID
                    questionId,
                    subjectCode,
                    topicCode: topicCodeRaw,
                    sourceCode,
                    typeCode,
                    difficultyCode: diffCode,
                    pyqCode,
                    difficulty: q.difficultyLevel || difficulty,
                    questionType: q.questionType || 'Statement-based',
                    solution: q.solution || {
                        correctAnswerReason: q.explanation || '',
                        sourceOfQuestion: 'General Knowledge',
                        approachToSolve: 'Eliminate incorrect options systematically.'
                    },
                    explanation: q.solution?.correctAnswerReason || q.explanation || '',
                    tags: [
                        { type: 'subject',    label: topic },
                        { type: 'source',     label: q.sourceCode || 'AI' },
                        { type: 'qtype',      label: q.typeCode   || 'FA' },
                        { type: 'difficulty', label: diffCode },
                        { type: 'pyq',        label: pyqCode },
                    ]
                };
            }));
            questions = taggedQuestions;

            // Deduplicate against database and save to question_bank (fire-and-forget — does not block test delivery)
            const db = admin.firestore();
            
            // 1. Hash all incoming texts
            questions = questions.map(q => ({
                ...q,
                textHash: hashText(q.text)
            }));

            const hashesToSearch = [...new Set(questions.map(q => q.textHash))];
            const existingHashes = new Map();

            // Firestore 'in' query has a max of 30 items
            const chunkSize = 30;
            for (let i = 0; i < hashesToSearch.length; i += chunkSize) {
                const chunk = hashesToSearch.slice(i, i + chunkSize);
                try {
                    const snapshot = await db.collection('question_bank')
                        .where('textHash', 'in', chunk)
                        .get();
                    
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        existingHashes.set(data.textHash, data.questionId);
                    });
                } catch (err) {
                    console.error('Error fetching existing hashes:', err);
                }
            }

            const batch = db.batch();
            questions.forEach(q => {
                // If question exists, reuse its ID to avoid duplicates in DB, but keep the current object intact for test delivery
                const finalId = existingHashes.get(q.textHash) || q.questionId;
                q.id = finalId;
                q.questionId = finalId;

                const docRef = db.collection('question_bank').doc(finalId);
                batch.set(docRef, {
                    questionId:      finalId,
                    subjectCode:     q.subjectCode,
                    topicCode:       q.topicCode,
                    sourceCode:      q.sourceCode,
                    typeCode:        q.typeCode,
                    difficultyCode:  q.difficultyCode,
                    pyqCode:         q.pyqCode,
                    text:            q.text,
                    options:         q.options,
                    correctAnswer:   q.correctAnswer,
                    solution:        q.solution,
                    tags:            q.tags,
                    questionType:    q.questionType,
                    textHash:        q.textHash,
                    isAIGenerated:   true,
                    addedBy:         'ai-generation',
                    createdAt:       admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt:       admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true }); // merge: existing manual entries are not overwritten
            });
            batch.commit().catch(err => console.error('question_bank batch write failed:', err));

            // Cache for future use (fire and forget)
            admin.firestore().collection('cached_tests').add({
                questions,
                topic,
                difficulty,
                questionCount: questions.length,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.error('Failed to cache test:', err));

        } catch (error) {
            if (error instanceof functions.https.HttpsError) throw error;
            console.error('Test generation error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to generate test');
        }
    }

    // 3. Create active session
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await admin.firestore().collection('_test_questions').doc(testId).set({
        questions,
        createdBy: userId,
        topic,
        difficulty,
        questionCount: questions.length,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 24 * 60 * 60 * 1000)
        ),
        fromCache
    });

    await admin.firestore().collection('users').doc(userId)
        .collection('test_sessions').doc(testId).set({
            questionCount: questions.length,
            topic,
            difficulty,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'in_progress',
            tabSwitchCount: 0
        });

    // Return sanitized questions (NO answers, NO explanations/solutions)
    const sanitizedQuestions = questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        tags: q.tags,
        questionType: q.questionType,
        difficulty: q.difficulty
        // ❌ NO correctAnswer
        // ❌ NO solution / explanation
    }));

    return { testId, questions: sanitizedQuestions };
});

/**
 * Callable function for institutions to sync their manually created or PDF/Topic generated
 * questions to the global question bank, avoiding duplicates via text hashing.
 */
exports.syncInstitutionQuestions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { questions, testTitle, accessType } = data;
    const userId = context.auth.uid;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return { success: true, count: 0, message: 'No questions to sync' };
    }

    // Default values for institution generated tests if they miss structured tags
    const defaultSubjectCode = 'TR'; // Trivial/General
    const defaultTopicCode = '01';
    const defaultSourceCode = 'SN'; // Standard
    const defaultTypeCode = 'FA'; // Factual
    const defaultDifficultyCode = 'ME'; // Medium
    const defaultPyqCode = 'NA';

    const db = admin.firestore();

    // 1. Hash and format incoming questions
    const formattedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text) continue;

        const textHash = hashText(q.text);

        // Map tags if available from TestCreator, otherwise use defaults
        const sCode = q.subjectCode || defaultSubjectCode;
        const tCode = q.topicCode || defaultTopicCode;
        
        let pyqCode = defaultPyqCode;
        let diffCode = q.difficultyCode || DIFFICULTY_MAP[q.difficulty] || defaultDifficultyCode;
        let typeCode = q.typeCode || QTYPE_CODES[q.questionType] || defaultTypeCode;
        let srcCode = q.sourceCode || defaultSourceCode;

        // Note: For institutions, we typically just generate random/sequential IDs if they are new
        const serial = Math.floor(Math.random() * 9000) + 1000;
        const fallbackId = makeQuestionId(sCode, tCode, srcCode, typeCode, diffCode, pyqCode, serial);

        formattedQuestions.push({
            ...q,
            questionId: q.questionId || fallbackId,
            subjectCode: sCode,
            topicCode: tCode,
            sourceCode: srcCode,
            typeCode: typeCode,
            difficultyCode: diffCode,
            pyqCode: pyqCode,
            textHash,
            isAIGenerated: q.isAIGenerated !== undefined ? q.isAIGenerated : true, // most inst tests are AI gen now
            addedBy: q.addedBy || userId
        });
    }

    if (formattedQuestions.length === 0) return { success: true, count: 0 };

    // 2. Find existing hashes
    const hashesToSearch = [...new Set(formattedQuestions.map(q => q.textHash))];
    const existingHashes = new Map();

    const chunkSize = 30;
    for (let i = 0; i < hashesToSearch.length; i += chunkSize) {
        const chunk = hashesToSearch.slice(i, i + chunkSize);
        try {
            const snapshot = await db.collection('question_bank')
                .where('textHash', 'in', chunk)
                .get();
            
            snapshot.docs.forEach(doc => {
                const docData = doc.data();
                existingHashes.set(docData.textHash, docData.questionId);
            });
        } catch (err) {
            console.error('Error fetching existing hashes in syncInstitution:', err);
        }
    }

    // 3. Batch write new or merged questions
    const batch = db.batch();
    let updatedCount = 0;

    formattedQuestions.forEach(q => {
        const finalId = existingHashes.get(q.textHash) || q.questionId;
        
        const docRef = db.collection('question_bank').doc(finalId);
        
        // Base structure expected by question_bank
        const bankData = {
            questionId:      finalId,
            subjectCode:     q.subjectCode,
            topicCode:       q.topicCode,
            sourceCode:      q.sourceCode,
            typeCode:        q.typeCode,
            difficultyCode:  q.difficultyCode,
            pyqCode:         q.pyqCode,
            text:            q.text,
            options:         q.options || [],
            correctAnswer:   q.correctAnswer !== undefined ? q.correctAnswer : q.options?.[q.correctOption],
            solution:        q.solution || {
                correctAnswerReason: q.explanation || '',
                sourceOfQuestion: testTitle || 'Institution Assessment',
                approachToSolve: 'Review class notes or test materials.'
            },
            tags:            q.tags || [],
            questionType:    q.questionType || 'Statement-based',
            textHash:        q.textHash,
            isAIGenerated:   q.isAIGenerated,
            addedBy:         q.addedBy,
            // Used by Admin Question Bank filters
            source:          'institution',
            accessType:      accessType || null,
            updatedAt:       admin.firestore.FieldValue.serverTimestamp(),
        };

        // Standard merge write
        batch.set(docRef, {
            ...bankData,
            createdAt: admin.firestore.FieldValue.serverTimestamp() // only sets on create due to merge
        }, { merge: true });
        
        updatedCount++;
    });

    try {
        await batch.commit();
        return { success: true, count: updatedCount, synced: true };
    } catch (err) {
        console.error('Institution question bank sync failed:', err);
        throw new functions.https.HttpsError('internal', 'Failed to sync questions to bank');
    }
});

/**
 * Submit test answers — scoring happens server-side.
 * Correct answers and 3-layer solutions are revealed ONLY after submission.
 */
exports.submitTest = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { testId, answers, timeLeft = 0, totalDuration = 0 } = data;
    const userId = context.auth.uid;

    if (!testId || !answers) {
        throw new functions.https.HttpsError('invalid-argument', 'testId and answers are required');
    }

    const testDoc = await admin.firestore()
        .collection('_test_questions').doc(testId).get();

    if (!testDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Test not found or expired');
    }

    const testData = testDoc.data();

    if (testData.createdBy !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Test does not belong to you');
    }

    const correctQuestions = testData.questions;

    let score = 0;
    const results = [];

    correctQuestions.forEach((question) => {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer !== undefined && userAnswer === question.correctAnswer;

        if (isCorrect) score++;

        results.push({
            questionId: question.id,
            text: question.text,
            options: question.options,
            userAnswer: userAnswer !== undefined ? userAnswer : null,
            isCorrect,
            correctAnswer: question.correctAnswer,
            // Return full 3-layer solution
            solution: question.solution || {
                correctAnswerReason: question.explanation || '',
                sourceOfQuestion: 'General Knowledge',
                approachToSolve: 'Review the concept related to this question.'
            },
            explanation: question.solution?.correctAnswerReason || question.explanation || '',
            questionType: question.questionType,
            difficulty: question.difficulty,
            tags: question.tags
        });
    });

    const totalQuestions = correctQuestions.length;
    const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // Generate AI Study Suggestions
    let suggestions = null;

    try {
        const performanceSummary = {
            topic: testData.topic,
            score,
            totalQuestions,
            accuracy: `${accuracy}%`,
            weakAreas: results.filter(r => !r.isCorrect).map(r => r.tags?.find(t => t.type === 'topic')?.label || 'General'),
            strongAreas: results.filter(r => r.isCorrect).map(r => r.tags?.find(t => t.type === 'topic')?.label || 'General')
        };

        const uniqueWeakAreas = [...new Set(performanceSummary.weakAreas)];
        const uniqueStrongAreas = [...new Set(performanceSummary.strongAreas)];

        const prompt = `Analyze this student's test performance and provide study suggestions.
        
        Context:
        - Topic: ${testData.topic}
        - Score: ${score}/${totalQuestions} (${accuracy}%)
        - Weak Areas (Incorrect Answers): ${uniqueWeakAreas.join(', ') || 'None'}
        - Strong Areas (Correct Answers): ${uniqueStrongAreas.join(', ') || 'None'}

        Task:
        Provide 3 specific suggestions on what to study (focusOn) and what they have mastered (notFocusOn).
        
        Return ONLY a JSON object:
        {
            "focusOn": ["Specific concept 1", "Specific concept 2"],
            "notFocusOn": ["Mastered concept 1", "Mastered concept 2"],
            "tips": ["Actionable study tip 1", "Actionable study tip 2"]
        }`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });

        const responseText = result.response.text();

        try {
            suggestions = JSON.parse(responseText);
        } catch {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                suggestions = JSON.parse(jsonMatch[0]);
            }
        }

    } catch (aiError) {
        console.error('Study suggestion generation failed:', aiError);
        suggestions = {
            focusOn: ['Review incorrect answers'],
            notFocusOn: [],
            tips: ['Analyze your mistakes to improve.']
        };
    }

    // Save results
    await admin.firestore().collection('users').doc(userId)
        .collection('tests').doc(testId).set({
            score,
            totalQuestions,
            accuracy,
            topic: testData.topic,
            difficulty: testData.difficulty,
            results,
            suggestions,
            timeLeft,
            totalDuration,
            timeTaken: totalDuration - timeLeft,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        });

    await admin.firestore().collection('users').doc(userId)
        .collection('test_sessions').doc(testId).update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

    await admin.firestore().collection('_test_questions').doc(testId).delete();

    // Update User Stats & Streaks
    const userRef = admin.firestore().collection('users').doc(userId);
    await admin.firestore().runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        let stats = userData.stats || {
            testsAttempted: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            xp: 0,
            streak: 0,
            longestStreak: 0,
            lastActiveDate: null
        };

        const todayTimestamp = new Date();
        todayTimestamp.setHours(0, 0, 0, 0);
        
        let newStreak = stats.streak || 0;
        let lastActive = stats.lastActiveDate ? stats.lastActiveDate.toDate() : null;

        if (lastActive) {
            lastActive.setHours(0, 0, 0, 0);
            const diffTime = Math.abs(todayTimestamp - lastActive);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                newStreak += 1;
            } else if (diffDays > 1) {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }

        const longestStreak = Math.max(newStreak, stats.longestStreak || 0);
        const earnedXp = (score * 10) + (totalQuestions * 2);

        transaction.update(userRef, {
            'stats.testsAttempted': admin.firestore.FieldValue.increment(1),
            'stats.totalQuestions': admin.firestore.FieldValue.increment(totalQuestions),
            'stats.correctAnswers': admin.firestore.FieldValue.increment(score),
            'stats.xp': admin.firestore.FieldValue.increment(earnedXp),
            'stats.streakDays': newStreak,
            'stats.streak': newStreak,
            'stats.longestStreak': longestStreak,
            'stats.lastActiveDate': admin.firestore.FieldValue.serverTimestamp()
        });
    }).catch(err => {
        console.error("Failed to update user stats transaction:", err);
    });

    return {
        score,
        totalQuestions,
        accuracy,
        results,
        suggestions,
        timeTaken: totalDuration - timeLeft
    };
});

/**
 * Sync AI questions generated from the student dashboard into the global question bank.
 * Mirrors syncInstitutionQuestions but tags source as 'student-dashboard' and addedBy as the student.
 */
exports.syncStudentGeneratedQuestions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { questions, topic, targetExam } = data || {};
    const userId = context.auth.uid;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return { success: true, count: 0, message: 'No questions to sync' };
    }

    const db = admin.firestore();

    // Default codes for student-generated tests when tags are missing
    const subjectCodeFromTopic = resolveSubjectCode(topic || '');
    const defaultSubjectCode = subjectCodeFromTopic || 'TR';
    const defaultTopicCode = '01';
    const defaultSourceCode = 'SN';
    const defaultTypeCode = 'FA';
    const defaultDifficultyCode = 'ME';
    const defaultPyqCode = 'NA';

    // 1. Hash and format incoming questions
    const formattedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q || !q.text) continue;

        const textHash = hashText(q.text);

        const sCode = q.subjectCode || defaultSubjectCode;
        const tCode = q.topicCode || defaultTopicCode;
        const srcCode = q.sourceCode || defaultSourceCode;
        const typeCode = q.typeCode || QTYPE_CODES[q.questionType] || defaultTypeCode;
        const diffCode = q.difficultyCode || DIFFICULTY_MAP[q.difficulty] || defaultDifficultyCode;
        const pyqCode = q.pyqCode || defaultPyqCode;

        const serial = Math.floor(Math.random() * 9000) + 1000;
        const fallbackId = makeQuestionId(sCode, tCode, srcCode, typeCode, diffCode, pyqCode, serial);

        formattedQuestions.push({
            ...q,
            questionId: q.questionId || fallbackId,
            subjectCode: sCode,
            topicCode: tCode,
            sourceCode: srcCode,
            typeCode,
            difficultyCode: diffCode,
            pyqCode,
            textHash,
            isAIGenerated: true,
            addedBy: userId,
            source: 'student-dashboard',
            targetExam: targetExam || null
        });
    }

    if (formattedQuestions.length === 0) {
        return { success: true, count: 0, message: 'No valid questions after formatting' };
    }

    // 2. Find existing hashes in question_bank
    const hashesToSearch = [...new Set(formattedQuestions.map(q => q.textHash))];
    const existingHashes = new Map();

    const chunkSize = 30;
    for (let i = 0; i < hashesToSearch.length; i += chunkSize) {
        const chunk = hashesToSearch.slice(i, i + chunkSize);
        try {
            const snapshot = await db.collection('question_bank')
                .where('textHash', 'in', chunk)
                .get();

            snapshot.docs.forEach(doc => {
                const docData = doc.data();
                if (docData.textHash && docData.questionId) {
                    existingHashes.set(docData.textHash, docData.questionId);
                }
            });
        } catch (err) {
            console.error('Error fetching existing hashes in syncStudentGeneratedQuestions:', err);
        }
    }

    // 3. Batch write new or merged questions
    const batch = db.batch();
    let updatedCount = 0;

    formattedQuestions.forEach(q => {
        const finalId = existingHashes.get(q.textHash) || q.questionId;
        const docRef = db.collection('question_bank').doc(finalId);

        const bankData = {
            questionId: finalId,
            subjectCode: q.subjectCode,
            topicCode: q.topicCode,
            sourceCode: q.sourceCode,
            typeCode: q.typeCode,
            difficultyCode: q.difficultyCode,
            pyqCode: q.pyqCode,
            text: q.text,
            options: q.options || [],
            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.options?.[q.correctOption],
            solution: q.solution || {
                correctAnswerReason: q.explanation || '',
                sourceOfQuestion: topic || 'Student Dashboard Test',
                approachToSolve: 'Review related notes and concepts from the test topic.'
            },
            tags: q.tags || [],
            questionType: q.questionType || 'Statement-based',
            textHash: q.textHash,
            isAIGenerated: true,
            addedBy: q.addedBy || userId,
            source: q.source || 'student-dashboard',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(docRef, {
            ...bankData,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        updatedCount++;
    });

    try {
        await batch.commit();
        return { success: true, count: updatedCount, synced: true };
    } catch (err) {
        console.error('Student question bank sync failed:', err);
        throw new functions.https.HttpsError('internal', 'Failed to sync student-generated questions to bank');
    }
});
