/**
 * Test Generation & Submission Cloud Functions
 * SEC-1: Server-side question storage — answers never exposed to client
 *
 * Production hardening:
 * - runWith() for memory/timeout on all functions
 * - Firestore batch size guard (≤499 ops)
 * - Input sanitization for AI prompts
 * - Awaited fire-and-forget writes
 * - Shared utilities (prompt helpers, AI client, JSON parser)
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

const { checkAndIncrementRateLimit } = require('./rateLimit');
const { generateJSON } = require('./utils/geminiClient');
const {
    buildTypeDistributionInstruction,
    THREE_LAYER_SOLUTION_INSTRUCTION,
    TAGGING_INSTRUCTION,
    QUESTION_TYPE_LABELS,
    parseAIJsonResponse,
    sanitizeForPrompt,
} = require('./utils/promptHelpers');
const { commitInBatches } = require('./utils/validators');

// ─── Hashing ──────────────────────────────────────────────────────────────────

function hashText(text) {
    if (!text) return '';
    return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

// ─── Question Bank Tagging Helpers ────────────────────────────────────────────

const SUBJECT_CODES = {
    'Indian Polity': 'IP', 'History and Ancient Medieval': 'AM', 'Modern India': 'MI',
    'Indian Culture': 'IC', 'Geography': 'GE', 'Economy of India': 'EI',
    'Environment': 'EN', 'Science and Technology': 'ST', 'Current Affairs': 'CA', 'Trivial': 'TR',
};

const SOURCE_CODES   = { Standard: 'SN', Advanced: 'AD', Random: 'RN', 'Current Issue': 'CI', 'Not Applicable': 'NA' };
const QTYPE_CODES    = { 
    Factual: 'FA', 
    Conceptual: 'CO', 
    'Application Based': 'AB', 
    'Application-Based': 'AB',
    Definition: 'DE', 
    Definitional: 'DE',
    Informative: 'IN' 
};
const DIFFICULTY_MAP = { Hard: 'TO', Intermediate: 'ME', Easy: 'ES' };
const PYQ_CODES      = { CSE: 'CS', CDSE: 'CD', NDA: 'ND', CISF: 'CI', CAPF: 'CP', 'Not Applicable': 'NA' };

function resolveSubjectCode(topic) {
    const lower = (topic || '').toLowerCase();
    const found = Object.entries(SUBJECT_CODES).find(([name]) =>
        lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)
    );
    return found ? found[1] : 'TR';
}

/** Build 16-char question ID: AA-00-BB-CC-DD-EE-0000 */
function makeQuestionId(subCode, topicCode, srcCode, typeCode, diffCode, pyqCode, serial) {
    return `${subCode}-${String(topicCode).padStart(2, '0')}-${srcCode}-${typeCode}-${diffCode}-${pyqCode}-${String(serial).padStart(4, '0')}`;
}

/**
 * Allocate a range of serial numbers in ONE transaction.
 * Replaces per-question getNextSerial() to eliminate N transactions.
 * @param {string} subjectCode
 * @param {string} topicCode
 * @param {number} count - How many serials to reserve
 * @returns {Promise<number[]>} Array of serial numbers
 */
async function allocateSerials(subjectCode, topicCode, count) {
    const counterId = `${subjectCode}-${String(topicCode).padStart(2, '0')}`;
    const ref = admin.firestore().collection('tag_counters').doc(counterId);
    try {
        const startSerial = await admin.firestore().runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            const current = doc.exists ? (doc.data().count || 0) : 0;
            tx.set(ref, { count: current + count }, { merge: true });
            return current + 1;
        });
        return Array.from({ length: count }, (_, i) => startSerial + i);
    } catch {
        // Fallback: generate random serials (non-overlapping within batch)
        const base = Math.floor(Math.random() * 8000) + 1000;
        return Array.from({ length: count }, (_, i) => base + i);
    }
}

// ─── Shared: Find existing hashes in question_bank ────────────────────────────

async function findExistingHashes(db, hashes) {
    const existingHashes = new Map();
    const chunkSize = 30; // Firestore 'in' query limit
    const chunks = [];
    for (let i = 0; i < hashes.length; i += chunkSize) {
        chunks.push(hashes.slice(i, i + chunkSize));
    }

    // Parallelize all chunk queries instead of sequential loop
    const results = await Promise.allSettled(
        chunks.map(chunk =>
            db.collection('question_bank')
                .where('textHash', 'in', chunk)
                .get()
        )
    );

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            result.value.docs.forEach(doc => {
                const data = doc.data();
                if (data.textHash && data.questionId) {
                    existingHashes.set(data.textHash, data.questionId);
                }
            });
        } else {
            console.error('Error fetching existing hashes:', result.reason?.message);
        }
    });
    return existingHashes;
}

// ─────────────────────────────────────────────────────────────────────────────
// generateTest
// ─────────────────────────────────────────────────────────────────────────────

exports.generateTest = functions
    .runWith({ memory: '512MB', timeoutSeconds: 120 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const rawTopic = data?.topic;
        const questionCount = data?.questionCount || 10;
        const difficulty = data?.difficulty || 'Hard';
        const userId = context.auth.uid;

        // Input validation
        if (!rawTopic || typeof rawTopic !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Topic is required');
        }
        if (questionCount < 1 || questionCount > 100) {
            throw new functions.https.HttpsError('invalid-argument', 'Question count must be 1-100');
        }

        // Sanitize topic before using in AI prompt
        const topic = sanitizeForPrompt(rawTopic, 200);

        let questions = null;
        let fromCache = false;

        // 1. Try cache — only for small tests (≤25) to reduce stale repetition
        if (questionCount <= 25) {
            try {
                const cacheSnapshot = await admin.firestore().collection('cached_tests')
                    .where('topic', '==', topic)
                    .where('difficulty', '==', difficulty)
                    .where('questionCount', '==', questionCount)
                    .limit(10)
                    .get();

                if (!cacheSnapshot.empty) {
                    const randomDoc = cacheSnapshot.docs[Math.floor(Math.random() * cacheSnapshot.size)];
                    questions = randomDoc.data().questions;
                    questions = questions.sort(() => Math.random() - 0.5);
                    fromCache = true;
                    console.log(`Serving cached test for topic: ${topic}`);
                }
            } catch (error) {
                console.error('Cache read error:', error.message);
            }
        }

        // 2. Generate via Gemini if not cached
        if (!questions) {
            await checkAndIncrementRateLimit(userId, 'test_generation');

            const typeInstruction = buildTypeDistributionInstruction(questionCount, topic);

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
    "text": "Statement-I: ... \nStatement-II: ...",
    "options": ["...", "...", "...", "..."],
    "correctAnswer": 0,
    "difficultyLevel": "Hard",
    "questionType": "Assertion-Reason",
    "strategy": "Conceptual Linkage",
    "solution": {
      "correctAnswerReason": "...",
      "sourceOfQuestion": "...",
      "approachToSolve": "..."
    },
    "subjectCode": "...",
    "topicCode": "...",
    "sourceCode": "...",
    "typeCode": "...",
    "difficultyCode": "...",
    "pyqCode": "..."
  }
]`;

            try {
                const responseText = await generateJSON(prompt);
                questions = parseAIJsonResponse(responseText, 'array');

                if (!Array.isArray(questions) || questions.length === 0) {
                    throw new functions.https.HttpsError('internal', 'No questions generated');
                }

                // Deduplicate
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

${buildTypeDistributionInstruction(deficit, topic)}
${THREE_LAYER_SOLUTION_INSTRUCTION}

Return ONLY a JSON Array (same format as before).`;

                    try {
                        const fillText = await generateJSON(fillPrompt);
                        const fillQuestions = parseAIJsonResponse(fillText, 'array');
                        if (Array.isArray(fillQuestions)) {
                            fillQuestions.forEach(q => {
                                const key = (q.text || '').trim().toLowerCase();
                                if (!key || seenTexts.has(key)) return;
                                seenTexts.add(key);
                                questions.push(q);
                            });
                        }
                    } catch (fillErr) {
                        console.warn('Fill-up batch failed:', fillErr.message);
                        break;
                    }
                }

                // Add IDs, tags, normalise solution — and assign structured question IDs
                const subjectCode = resolveSubjectCode(topic);

                // Bulk-allocate serials in ONE transaction (was N transactions before)
                const primaryTopicCode = questions[0]?.topicCode || '01';
                const serials = await allocateSerials(subjectCode, primaryTopicCode, questions.length);

                const taggedQuestions = questions.map((q, idx) => {
                    const topicCodeRaw = q.topicCode || '01';
                    const sourceCode   = SOURCE_CODES[q.sourceCode] ? q.sourceCode : 'SN';
                    const typeCode     = QTYPE_CODES[q.typeCode] ? q.typeCode : 'FA';
                    const diffCode     = q.difficultyCode || DIFFICULTY_MAP[q.difficultyLevel || difficulty] || 'ME';
                    const pyqCode      = PYQ_CODES[q.pyqCode] ? q.pyqCode : 'NA';

                    const serial = serials[idx];
                    const questionId = makeQuestionId(subjectCode, topicCodeRaw, sourceCode, typeCode, diffCode, pyqCode, serial);

                    return {
                        ...q,
                        id: questionId,
                        questionId,
                        subjectCode,
                        topicCode: topicCodeRaw,
                        sourceCode,
                        typeCode,
                        difficultyCode: diffCode,
                        pyqCode,
                        difficulty: q.difficultyLevel || difficulty,
                        questionType: QUESTION_TYPE_LABELS[q.questionType] || q.questionType || 'Statement-based',
                        solution: q.solution || {
                            correctAnswerReason: q.explanation || '',
                            sourceOfQuestion: 'General Knowledge',
                            approachToSolve: 'Eliminate incorrect options systematically.'
                        },
                        explanation: q.solution?.correctAnswerReason || q.explanation || '',
                        tags: [
                            { type: 'subject', label: topic },
                            { type: 'source', label: q.sourceCode || 'AI' },
                            { type: 'qtype', label: q.typeCode || 'FA' },
                            { type: 'difficulty', label: diffCode },
                            { type: 'pyq', label: pyqCode },
                        ]
                    };
                });
                questions = taggedQuestions;

                // Deduplicate against database and save to question_bank (batch-safe)
                const db = admin.firestore();
                questions = questions.map(q => ({ ...q, textHash: hashText(q.text) }));

                const hashesToSearch = [...new Set(questions.map(q => q.textHash))];
                const existingHashes = await findExistingHashes(db, hashesToSearch);

                // Build batch operations (won't exceed 500 limit thanks to commitInBatches)
                const bankOps = questions.map(q => {
                    const finalId = existingHashes.get(q.textHash) || q.questionId;
                    q.id = finalId;
                    q.questionId = finalId;

                    return {
                        ref: db.collection('question_bank').doc(finalId),
                        data: {
                            questionId: finalId,
                            subjectCode: q.subjectCode,
                            topicCode: q.topicCode,
                            sourceCode: q.sourceCode,
                            typeCode: q.typeCode,
                            difficultyCode: q.difficultyCode,
                            pyqCode: q.pyqCode,
                            text: q.text,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            solution: q.solution,
                            tags: q.tags,
                            questionType: q.questionType,
                            strategy: q.strategy || 'General',
                            textHash: q.textHash,
                            isAIGenerated: true,
                            addedBy: 'ai-generation',
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        options: { merge: true },
                    };
                });

                // Await both writes (no more fire-and-forget)
                await Promise.all([
                    commitInBatches(db, bankOps).catch(err =>
                        console.error('question_bank batch write failed:', err.message)
                    ),
                    db.collection('cached_tests').add({
                        questions,
                        topic,
                        difficulty,
                        questionCount: questions.length,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    }).catch(err =>
                        console.error('Failed to cache test:', err.message)
                    ),
                ]);

            } catch (error) {
                if (error instanceof functions.https.HttpsError) throw error;
                console.error('Test generation error:', error.message);
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
            fromCache,
        });

        await admin.firestore().collection('users').doc(userId)
            .collection('test_sessions').doc(testId).set({
                questionCount: questions.length,
                topic,
                difficulty,
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'in_progress',
                tabSwitchCount: 0,
            });

        // Return sanitized questions (NO answers, NO explanations/solutions)
        const sanitizedQuestions = questions.map(q => ({
            id: q.id,
            text: q.text,
            options: q.options,
            tags: q.tags,
            questionType: q.questionType,
            strategy: q.strategy,
            difficulty: q.difficulty,
        }));

        return { testId, questions: sanitizedQuestions };
    });

// ─────────────────────────────────────────────────────────────────────────────
// syncInstitutionQuestions
// ─────────────────────────────────────────────────────────────────────────────

exports.syncInstitutionQuestions = functions
    .runWith({ memory: '256MB', timeoutSeconds: 60 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { questions, testTitle, accessType } = data;
        const userId = context.auth.uid;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return { success: true, count: 0, message: 'No questions to sync' };
        }

        const db = admin.firestore();
        const defaultSubjectCode = 'TR';
        const defaultTopicCode = '01';
        const defaultSourceCode = 'SN';
        const defaultTypeCode = 'FA';
        const defaultDifficultyCode = 'ME';
        const defaultPyqCode = 'NA';

        // 1. Hash and format incoming questions
        const formattedQuestions = [];
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text) continue;

            const textHash = hashText(q.text);
            const sCode = q.subjectCode || defaultSubjectCode;
            const tCode = q.topicCode || defaultTopicCode;
            const pyqCode = defaultPyqCode;
            const diffCode = q.difficultyCode || DIFFICULTY_MAP[q.difficulty] || defaultDifficultyCode;
            const typeCode = q.typeCode || QTYPE_CODES[q.questionType] || defaultTypeCode;
            const srcCode = q.sourceCode || defaultSourceCode;

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
                isAIGenerated: q.isAIGenerated !== undefined ? q.isAIGenerated : true,
                addedBy: q.addedBy || userId,
            });
        }

        if (formattedQuestions.length === 0) return { success: true, count: 0 };

        // 2. Find existing hashes
        const hashesToSearch = [...new Set(formattedQuestions.map(q => q.textHash))];
        const existingHashes = await findExistingHashes(db, hashesToSearch);

        // 3. Batch write (safe — respects 500-op limit)
        const ops = formattedQuestions.map(q => {
            const finalId = existingHashes.get(q.textHash) || q.questionId;
            return {
                ref: db.collection('question_bank').doc(finalId),
                data: {
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
                        sourceOfQuestion: testTitle || 'Institution Assessment',
                        approachToSolve: 'Review class notes or test materials.'
                    },
                    tags: q.tags || [],
                    questionType: q.questionType || 'Statement-based',
                    textHash: q.textHash,
                    isAIGenerated: q.isAIGenerated,
                    addedBy: q.addedBy,
                    source: 'institution',
                    accessType: accessType || null,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                options: { merge: true },
            };
        });

        try {
            await commitInBatches(db, ops);
            return { success: true, count: formattedQuestions.length, synced: true };
        } catch (err) {
            console.error('Institution question bank sync failed:', err.message);
            throw new functions.https.HttpsError('internal', 'Failed to sync questions to bank');
        }
    });

// ─────────────────────────────────────────────────────────────────────────────
// submitTest
// ─────────────────────────────────────────────────────────────────────────────

exports.submitTest = functions
    .runWith({ memory: '512MB', timeoutSeconds: 120 })
    .https.onCall(async (data, context) => {
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
                solution: question.solution || {
                    correctAnswerReason: question.explanation || '',
                    sourceOfQuestion: 'General Knowledge',
                    approachToSolve: 'Review the concept related to this question.'
                },
                explanation: question.solution?.correctAnswerReason || question.explanation || '',
                questionType: question.questionType,
                strategy: question.strategy,
                difficulty: question.difficulty,
                tags: question.tags,
            });
        });

        const totalQuestions = correctQuestions.length;
        const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

        // Generate AI Study Suggestions
        let suggestions = null;

        try {
            const uniqueWeakAreas = [...new Set(
                results.filter(r => !r.isCorrect).map(r => r.tags?.find(t => t.type === 'topic')?.label || 'General')
            )];
            const uniqueStrongAreas = [...new Set(
                results.filter(r => r.isCorrect).map(r => r.tags?.find(t => t.type === 'topic')?.label || 'General')
            )];

            const prompt = `Analyze this student's test performance and provide study suggestions.
        
        Context:
        - Topic: ${sanitizeForPrompt(testData.topic, 200)}
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

            const responseText = await generateJSON(prompt);
            suggestions = parseAIJsonResponse(responseText, 'object');
        } catch (aiError) {
            console.error('Study suggestion generation failed:', aiError.message);
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
                submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        await admin.firestore().collection('users').doc(userId)
            .collection('test_sessions').doc(testId).update({
                status: 'completed',
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        await admin.firestore().collection('_test_questions').doc(testId).delete();

        // Update User Stats & Streaks
        const userRef = admin.firestore().collection('users').doc(userId);
        await admin.firestore().runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return;

            const userData = userDoc.data();
            const stats = userData.stats || {
                testsAttempted: 0, totalQuestions: 0, correctAnswers: 0,
                xp: 0, streak: 0, longestStreak: 0, lastActiveDate: null,
            };

            const todayTimestamp = new Date();
            todayTimestamp.setHours(0, 0, 0, 0);

            let newStreak = stats.streak || 0;
            let lastActive = stats.lastActiveDate ? stats.lastActiveDate.toDate() : null;

            if (lastActive) {
                lastActive.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil(Math.abs(todayTimestamp - lastActive) / (1000 * 60 * 60 * 24));
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
                'stats.lastActiveDate': admin.firestore.FieldValue.serverTimestamp(),
            });
        }).catch(err => {
            console.error('Failed to update user stats transaction:', err.message);
        });

        return {
            score,
            totalQuestions,
            accuracy,
            results,
            suggestions,
            timeTaken: totalDuration - timeLeft,
        };
    });

// ─────────────────────────────────────────────────────────────────────────────
// syncStudentGeneratedQuestions
// ─────────────────────────────────────────────────────────────────────────────

exports.syncStudentGeneratedQuestions = functions
    .runWith({ memory: '256MB', timeoutSeconds: 60 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { questions, topic, targetExam } = data || {};
        const userId = context.auth.uid;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return { success: true, count: 0, message: 'No questions to sync' };
        }

        const db = admin.firestore();
        const subjectCodeFromTopic = resolveSubjectCode(topic || '');
        const defaultSubjectCode = subjectCodeFromTopic || 'TR';

        // 1. Hash and format incoming questions
        const formattedQuestions = [];
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q || !q.text) continue;

            const textHash = hashText(q.text);
            const sCode = q.subjectCode || defaultSubjectCode;
            const tCode = q.topicCode || '01';
            const srcCode = q.sourceCode || 'SN';
            const typeCode = q.typeCode || QTYPE_CODES[q.questionType] || 'FA';
            const diffCode = q.difficultyCode || DIFFICULTY_MAP[q.difficulty] || 'ME';
            const pyqCode = q.pyqCode || 'NA';

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
                targetExam: targetExam || null,
            });
        }

        if (formattedQuestions.length === 0) {
            return { success: true, count: 0, message: 'No valid questions after formatting' };
        }

        // 2. Find existing hashes in question_bank
        const hashesToSearch = [...new Set(formattedQuestions.map(q => q.textHash))];
        const existingHashes = await findExistingHashes(db, hashesToSearch);

        // 3. Batch write (safe — respects 500-op limit)
        const ops = formattedQuestions.map(q => {
            const finalId = existingHashes.get(q.textHash) || q.questionId;
            return {
                ref: db.collection('question_bank').doc(finalId),
                data: {
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
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                options: { merge: true },
            };
        });

        try {
            await commitInBatches(db, ops);
            return { success: true, count: formattedQuestions.length, synced: true };
        } catch (err) {
            console.error('Student question bank sync failed:', err.message);
            throw new functions.https.HttpsError('internal', 'Failed to sync student-generated questions to bank');
        }
    });
