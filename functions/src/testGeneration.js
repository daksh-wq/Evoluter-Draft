/**
 * Test Generation & Submission Cloud Functions
 * SEC-1: Server-side question storage — answers never exposed to client
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { checkAndIncrementRateLimit } = require('./rateLimit');

// Initialize Gemini (uses Firebase Functions config)
const genAI = new GoogleGenerativeAI(functions.config().gemini?.api_key || process.env.GEMINI_API_KEY || '');

/**
 * Generate a test — questions with answers stored server-side only.
 * Returns sanitized questions (no correct answers) to the client.
 */
exports.generateTest = functions.https.onCall(async (data, context) => {
    // Auth check
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

    // 1. Try to fetch from cache first
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
            fromCache = true;
            console.log(`Serving cached test for topic: ${topic}`);
        }
    } catch (error) {
        console.error('Cache read error:', error);
        // Continue to generation if cache fails
    }

    // 2. If not in cache, Generate via Gemini
    if (!questions) {
        // Rate limit check ONLY if generating fresh
        await checkAndIncrementRateLimit(userId, 'test_generation');

        const prompt = `You are a strict Question Setter. Generate ${questionCount} ${difficulty} MCQs STRICTLY on the topic: '${topic}'.

Rules:
1. Questions MUST be 100% relevant to '${topic}'.
2. Difficulty: ${difficulty}.
3. Output: Return ONLY a JSON Array.

JSON Format:
[
  {
    "text": "Question text...",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 0,
    "explanation": "Detailed verification..."
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
            } catch (parseErr) {
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

            // Add IDs and tags
            questions = questions.map((q, idx) => ({
                ...q,
                id: `ai-${Date.now()}-${idx}`,
                tags: q.tags || [
                    { type: 'source', label: 'AI' },
                    { type: 'topic', label: topic },
                    { type: 'difficulty', label: difficulty }
                ]
            }));

            // Save to Cache for future users (Fire and Forget)
            admin.firestore().collection('cached_tests').add({
                questions,
                topic,
                difficulty,
                questionCount,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.error('Failed to cache test:', err));

        } catch (error) {
            if (error instanceof functions.https.HttpsError) throw error;
            console.error('Test generation error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to generate test');
        }
    }

    // 3. Create active session (reused for both Cache & New)
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store FULL questions (with answers) SERVER-SIDE ONLY for this session
    await admin.firestore().collection('_test_questions').doc(testId).set({
        questions,
        createdBy: userId,
        topic,
        difficulty,
        questionCount: questions.length,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        ),
        fromCache // Analytics flag
    });

    // Create test session for user
    await admin.firestore().collection('users').doc(userId)
        .collection('test_sessions').doc(testId).set({
            questionCount: questions.length,
            topic,
            difficulty,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'in_progress',
            tabSwitchCount: 0 // Initialize for optimized proctoring
        });

    // Return sanitized questions (NO answers, NO explanations)
    const sanitizedQuestions = questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        tags: q.tags,
        // ❌ NO correctAnswer
        // ❌ NO explanation
    }));

    return {
        testId,
        questions: sanitizedQuestions
    };
});

/**
 * Submit test answers — scoring happens server-side.
 * Correct answers and explanations are revealed ONLY after submission.
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

    // Fetch correct answers from server-only collection
    const testDoc = await admin.firestore()
        .collection('_test_questions').doc(testId).get();

    if (!testDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Test not found or expired');
    }

    const testData = testDoc.data();

    // Verify test belongs to user
    if (testData.createdBy !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Test does not belong to you');
    }

    const correctQuestions = testData.questions;

    // Calculate score SERVER-SIDE
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
            explanation: question.explanation,
            tags: question.tags
        });
    });

    const totalQuestions = correctQuestions.length;
    const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // ---------------------------------------------------------
    // 4. Generate AI Study Suggestions (Personalized Feedback)
    // ---------------------------------------------------------
    let suggestions = null;

    try {
        // Construct a performance summary for the AI
        const performanceSummary = {
            topic: testData.topic,
            score,
            totalQuestions,
            accuracy: `${accuracy}%`,
            weakAreas: results.filter(r => !r.isCorrect).map(r => r.tags?.find(t => t.type === 'topic')?.label || 'General'),
            strongAreas: results.filter(r => r.isCorrect).map(r => r.tags?.find(t => t.type === 'topic')?.label || 'General')
        };

        // Aggregating unique topics for cleaner prompt
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
        } catch (e) {
            // Fallback parsing if JSON is markdown-wrapped
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                suggestions = JSON.parse(jsonMatch[0]);
            }
        }

    } catch (aiError) {
        console.error('Study suggestion generation failed:', aiError);
        // Fail silently - do not block test submission for this
        suggestions = {
            focusOn: ['Review incorrect answers'],
            notFocusOn: [],
            tips: ['Analyze your mistakes to improve.']
        };
    }

    // Save results to user's test history
    await admin.firestore().collection('users').doc(userId)
        .collection('tests').doc(testId).set({
            score,
            totalQuestions,
            accuracy,
            topic: testData.topic,
            difficulty: testData.difficulty,
            results,
            suggestions, // New field
            timeLeft,
            totalDuration,
            timeTaken: totalDuration - timeLeft,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        });

    // Update test session status
    await admin.firestore().collection('users').doc(userId)
        .collection('test_sessions').doc(testId).update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

    // Clean up server-side questions (they're now in test results)
    await admin.firestore().collection('_test_questions').doc(testId).delete();

    // ---------------------------------------------------------
    // 5. Update User Stats & Streaks
    // ---------------------------------------------------------
    const userRef = admin.firestore().collection('users').doc(userId);
    await admin.firestore().runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) return; // Skip if user doc somehow missing

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
        todayTimestamp.setHours(0, 0, 0, 0); // Midnight local server time (or UTC depending on your standard)
        
        let newStreak = stats.streak || 0;
        let lastActive = stats.lastActiveDate ? stats.lastActiveDate.toDate() : null;

        if (lastActive) {
            lastActive.setHours(0, 0, 0, 0);
            const diffTime = Math.abs(todayTimestamp - lastActive);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            if (diffDays === 1) {
                // Next consecutive day
                newStreak += 1;
            } else if (diffDays > 1) {
                // Streak broken
                newStreak = 1;
            } 
            // If diffDays === 0, they already played today, maintain streak
        } else {
            // First time playing
            newStreak = 1;
        }

        const longestStreak = Math.max(newStreak, stats.longestStreak || 0);

        // Calculate XP (10 per correct answer, 2 per question attempted)
        const earnedXp = (score * 10) + (totalQuestions * 2);

        transaction.update(userRef, {
            'stats.testsAttempted': admin.firestore.FieldValue.increment(1),
            'stats.totalQuestions': admin.firestore.FieldValue.increment(totalQuestions),
            'stats.correctAnswers': admin.firestore.FieldValue.increment(score),
            'stats.xp': admin.firestore.FieldValue.increment(earnedXp),
            'stats.streakDays': newStreak, // keeping frontend streakDays key consistent if needed, but in DB we'll update both for now
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
        suggestions, // Return to client
        timeTaken: totalDuration - timeLeft
    };
});
