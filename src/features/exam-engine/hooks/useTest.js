import { useState, useCallback, useRef, useEffect } from 'react';
import { auth, functions } from '@/services/firebase';
import { httpsCallable } from 'firebase/functions';
import logger from '@/utils/logger';
import { testService } from '../services/testService';
import { calculateResults } from '../utils/testLogic';
import { generateMockQuestions } from '@/utils/helpers';
import { TIME_PER_QUESTION, getDurationForCount } from '@/constants/appConstants';
import { updateUserStats } from '../../../services/userService';
import { removeFromCache } from '../../../services/cacheService';

/**
 * Custom hook for test state management
 * @returns {object} Test state and handlers
 */
export function useTest() {
    // -- State --
    const [activeTest, setActiveTest] = useState(null);
    const [activeTestId, setActiveTestId] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);

    // Status flags
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [isTestCompleted, setIsTestCompleted] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [isInstitutionTest, setIsInstitutionTest] = useState(false);
    const [activeTestName, setActiveTestName] = useState(null); // Title for institution tests

    /**
     * Helper to initialize test state
     */
    const setupTestSession = useCallback((questions, durationSeconds) => {
        // CRITICAL: Final dedup gate — strip any duplicate questions by ID + text
        const seenIds = new Set();
        const seenTexts = new Set();
        const uniqueQuestions = questions.filter(q => {
            const textKey = (q.text || '').trim().toLowerCase().substring(0, 100);
            if (seenIds.has(q.id)) return false;
            if (textKey && textKey.length > 10 && seenTexts.has(textKey)) return false;
            seenIds.add(q.id);
            if (textKey && textKey.length > 10) seenTexts.add(textKey);
            return true;
        });

        setActiveTest(uniqueQuestions);
        setActiveTestId(null);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMarkedForReview(new Set());
        setTimeLeft(durationSeconds);
        setTotalDuration(durationSeconds);
        setIsTestCompleted(false);
        setTestResults(null);
    }, []);

    /**
     * Start a mock test with generated questions (Fallback/Practice)
     */
    const startMockTest = useCallback((sourceDoc = null, questionCount = 100, durationMinutes = 120) => {
        const newQuestions = generateMockQuestions(questionCount, sourceDoc);
        setupTestSession(newQuestions, durationMinutes * 60);
    }, [setupTestSession]);

    /**
     * Generate and start an AI-powered test on a topic
     */
    // Bug #4 fix: store interval reference so it can always be cleared, even on unmount
    const progressIntervalRef = useRef(null);

    // Fix #2: clear any running progress interval when the hook's owner unmounts
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const startAITest = useCallback(async (topic, count = 10, difficulty = 'Hard', targetExam = 'UPSC CSE', resourceContent = null, pyqPercentage = 0) => {
        setIsGeneratingTest(true);
        setGenerationProgress(0);

        // Simulate Progress (Consistent & Slower Loading without decimals)
        let ticks = 0;
        progressIntervalRef.current = setInterval(() => {
            ticks++;
            setGenerationProgress(prev => {
                if (prev >= 92) return prev; // Stall at 92% until done
                
                // Gradually slow down as it gets higher, using ONLY integers
                // 0-40: fast (1 per 150ms -> 6s)
                // 40-70: medium (1 per 300ms -> 9s)
                // 70-85: slow (1 per 600ms -> 9s)
                // 85-92: very slow (1 per 1200ms -> 8.4s)
                let shouldIncrement = false;
                if (prev < 40) shouldIncrement = true;
                else if (prev < 70) shouldIncrement = ticks % 2 === 0;
                else if (prev < 85) shouldIncrement = ticks % 4 === 0;
                else shouldIncrement = ticks % 8 === 0;

                return shouldIncrement ? prev + 1 : prev;
            });
        }, 150);

        try {
            // 1. Generate Content (Delegate to Service)
            const questions = await testService.generateTestContent(topic, count, difficulty, targetExam, () => { }, resourceContent, pyqPercentage);

            clearInterval(progressIntervalRef.current);
            setGenerationProgress(100);
            await new Promise(r => setTimeout(r, 500)); // Show 100% briefly

            // Enforce fixed duration based on question count
            const durationSeconds = getDurationForCount(questions.length || count);

            setupTestSession(questions, durationSeconds);

            // Initialize History in Backend
            if (auth.currentUser) {
                const testId = `test-${Date.now()}`;
                setActiveTestId(testId);

                // Bug #5 fix: await initTestSession so failures are caught, not silently lost
                try {
                    await testService.initTestSession(auth.currentUser.uid, testId, topic, questions);
                } catch (sessionErr) {
                    logger.warn('initTestSession failed (non-blocking):', sessionErr);
                }

                // Fire-and-forget sync of generated questions to global Question Bank
                try {
                    const syncStudentQuestions = httpsCallable(functions, 'syncStudentGeneratedQuestions');
                    syncStudentQuestions({
                        questions,
                        topic: topic || 'Mixed',
                        targetExam
                    }).catch(() => {
                        // Non-blocking: ignore errors here, still allow test to run
                        return;
                    });
                } catch {
                    // Swallow function client errors; they should not block test start
                }
            }

            return true;
        } catch (error) {
            logger.error('Error starting AI test:', error);
            clearInterval(progressIntervalRef.current);
            // Fallback: use fixed count-based duration
            startMockTest(null, count, Math.round(getDurationForCount(count) / 60));
            return false;
        } finally {
            setIsGeneratingTest(false);
            setGenerationProgress(0);
        }
    }, [startMockTest]);

    /**
     * Start a custom local test immediately (Used for PYQs)
     */
    const startCustomTest = useCallback(async (questions, testName = 'Custom Test', _difficulty = 'Intermediate') => {
        setIsGeneratingTest(true);
        try {
            const count = questions.length;
            // Enforce fixed duration based on question count
            const durationSeconds = getDurationForCount(count);

            setupTestSession(questions, durationSeconds);
            setActiveTestName(testName);

            // Bug #3 fix: compute ID once so state and Firestore share the exact same value
            const customTestId = `custom-${Date.now()}`;
            setActiveTestId(customTestId);

            // Bug #5 fix: await initTestSession so failures are surfaced, not silently lost
            if (auth.currentUser) {
                try {
                    await testService.initTestSession(auth.currentUser.uid, customTestId, testName, questions);
                } catch (sessionErr) {
                    logger.warn('initTestSession failed (non-blocking):', sessionErr);
                }
            }
            return true;
        } catch (error) {
            logger.error('Error starting custom test:', error);
            return false;
        } finally {
            setIsGeneratingTest(false);
        }
    }, [setupTestSession]);

    /**
     * Start a specific test created by an institution
     */
    const startInstitutionTest = useCallback(async (testData) => {
        setIsGeneratingTest(true);
        try {
            // 1. Setup Local State — enforce fixed count-based timing
            const durationSeconds = getDurationForCount(testData.questions?.length || 0);

            // Format questions — ensure both `text` and `question` fields exist for
            // rendering compatibility. Convert string correctAnswer → option index so
            // scoring (which stores answers as indices) works correctly.
            const questions = testData.questions.map((q, idx) => {
                const options = q.options || [];
                // correctAnswer from Firestore is a string (the correct option text).
                // selectAnswer() records the selected *index*, so we must convert.
                const correctAnswerIndex = options.indexOf(q.correctAnswer);
                // Bug #6 fix: warn and use null instead of silently defaulting to index 0,
                // which would incorrectly mark the first option as correct.
                if (correctAnswerIndex < 0) {
                    logger.warn(`Institution question "${q.id}" has correctAnswer "${q.correctAnswer}" not found in options`, options);
                }
                return {
                    id: q.id || `inst-${idx}`,
                    text: q.text,                   // used by storage / formatters
                    question: q.text,               // used by QuestionCard renderer
                    options,
                    correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : null,
                    explanation: q.explanation || 'No explanation provided.',
                    tags: [{ type: 'subject', label: testData.subject || 'General' }]
                };
            });

            setupTestSession(questions, durationSeconds);
            setActiveTestId(testData.id); // Track specific test ID
            setIsInstitutionTest(true);
            setActiveTestName(testData.title || testData.subject || 'Institution Test');

            // 2. Initialize History in Backend
            if (auth.currentUser) {
                // We use the original test ID to link results back to it
                try {
                    await testService.initTestSession(auth.currentUser.uid, testData.id, testData.title, questions);
                } catch (sessionErr) {
                    logger.warn('initTestSession failed (non-blocking):', sessionErr);
                }
            }
            return true;
        } catch (error) {
            logger.error('Error starting Institution test:', error);
            return false;
        } finally {
            setIsGeneratingTest(false);
        }
    }, [setupTestSession]);

    /**
     * Submit the test and calculate results
     */
    const submitTest = useCallback(async (reasonInput = null, warningCount = 0) => {
        // Prevent React Event objects from leaking into Firestore when used directly in onClick
        const validReason = typeof reasonInput === 'string' ? reasonInput : null;
        if (!activeTest) return;

        // 1. Calculate Results (Pure Logic)
        const results = calculateResults(activeTest, answers, timeLeft, totalDuration);
        if (!results) return;

        setTestResults(results);
        setIsTestCompleted(true);

        // 2. Persist to Backend
        if (auth.currentUser) {
            try {
                const testId = activeTestId || `test-${Date.now()}`;
                // For institution tests use the stored name; for AI tests derive from question tags
                const topic = isInstitutionTest && activeTestName
                    ? activeTestName
                    : (activeTest[0]?.tags?.find(t => t.type === 'topic')?.label || 'Mixed');

                // Save Result
                await testService.saveTestResult(
                    auth.currentUser.uid,
                    testId,
                    results,
                    activeTest,
                    answers,
                    topic,
                    {
                        isInstitutionTest,
                        originalTestId: activeTestId,
                        terminationReason: validReason,
                        testName: isInstitutionTest ? activeTestName : undefined,
                        warningCount: warningCount || 0,
                    }
                );

                // Update User Stats (Side Effect)
                const xpGained = await updateUserStats(auth.currentUser.uid, results, activeTest, answers);

                // Update XP history
                await testService.updateTestXP(auth.currentUser.uid, testId, xpGained);

                // Invalidate Cache
                removeFromCache(`test_history_${auth.currentUser.uid}`);

            } catch (err) {
                logger.error("Failed to save test results:", err);
            }
        }
    }, [activeTest, answers, timeLeft, totalDuration, activeTestId, isInstitutionTest, activeTestName]);

    // -- Answer & Navigation Handlers --

    const selectAnswer = useCallback((questionId, optionIndex) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    }, []);

    const toggleMarkForReview = useCallback((questionId) => {
        setMarkedForReview(prev => {
            const newSet = new Set(prev);
            newSet.has(questionId) ? newSet.delete(questionId) : newSet.add(questionId);
            return newSet;
        });
    }, []);

    const goToNextQuestion = useCallback(() => {
        if (activeTest && currentQuestionIndex < activeTest.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    }, [activeTest, currentQuestionIndex]);

    const goToPrevQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
    }, [currentQuestionIndex]);

    const goToQuestion = useCallback((index) => {
        if (activeTest && index >= 0 && index < activeTest.length) setCurrentQuestionIndex(index);
    }, [activeTest]);

    const exitTest = useCallback(() => {
        setActiveTest(null);
        setActiveTestId(null);
        setActiveTestName(null);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMarkedForReview(new Set());
        setTimeLeft(0);
        setIsTestCompleted(false);
        setTestResults(null);
        setIsInstitutionTest(false);
    }, []);

    const getResults = useCallback(() => {
        return calculateResults(activeTest, answers, timeLeft, totalDuration);
    }, [activeTest, answers, timeLeft, totalDuration]);

    return {
        // State
        activeTest,
        currentQuestionIndex,
        currentQuestion: activeTest ? activeTest[currentQuestionIndex] : null,
        answers,
        markedForReview,
        timeLeft,
        isGeneratingTest,
        generationProgress,
        isTestCompleted,
        testResults,
        isInstitutionTest,

        // Actions
        setTimeLeft,
        startMockTest,
        startAITest,
        startInstitutionTest,
        startCustomTest,
        submitTest,
        exitTest,
        goToNextQuestion,
        goToPrevQuestion,
        goToQuestion,
        selectAnswer,
        toggleMarkForReview,
        getResults,
    };
}

export default useTest;
