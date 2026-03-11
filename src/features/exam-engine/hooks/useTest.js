import { useState, useCallback } from 'react';
import { auth } from '@/services/firebase';
import logger from '@/utils/logger';
import { testService } from '../services/testService';
import { calculateResults } from '../utils/testLogic';
import { generateMockQuestions } from '@/utils/helpers';

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
     * Start a mock test with generated questions (Fallback/Practice)
     */
    const startMockTest = useCallback((sourceDoc = null, questionCount = 100, durationMinutes = 120) => {
        const newQuestions = generateMockQuestions(questionCount, sourceDoc);
        setupTestSession(newQuestions, durationMinutes * 60);
    }, []);

    /**
     * Helper to initialize test state
     */
    const setupTestSession = (questions, durationSeconds) => {
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
    };

    /**
     * Generate and start an AI-powered test on a topic
     */
    const startAITest = useCallback(async (topic, count = 10, difficulty = 'Hard', targetExam = 'UPSC CSE', resourceContent = null, pyqPercentage = 0) => {
        setIsGeneratingTest(true);
        setGenerationProgress(0);

        // Simulate Progress (Smooth Loading)
        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 90) return prev; // Stall at 90% until done
                // Slow down as it gets higher
                const increment = prev < 50 ? 2 : prev < 80 ? 1 : 0.5;
                return Math.min(prev + increment, 90);
            });
        }, 150);

        try {
            // 1. Generate Content (Delegate to Service)
            const questions = await testService.generateTestContent(topic, count, difficulty, targetExam, () => { }, resourceContent, pyqPercentage);

            clearInterval(progressInterval);
            setGenerationProgress(100);
            await new Promise(r => setTimeout(r, 500)); // Show 100% briefly

            // 2. Setup Local State
            const duration = count * 1.5 * 60; // 1.5 mins per question
            setupTestSession(questions, duration);

            // 3. Initialize History in Backend (Fire & Forget)
            if (auth.currentUser) {
                const testId = `test-${Date.now()}`;
                setActiveTestId(testId);
                testService.initTestSession(auth.currentUser.uid, testId, topic, questions);
            }

            return true;
        } catch (error) {
            logger.error('Error starting AI test:', error);
            clearInterval(progressInterval);
            startMockTest(null, count, count * 1.5);
            return false;
        } finally {
            setIsGeneratingTest(false);
            setGenerationProgress(0);
        }
    }, [startMockTest]);

    /**
     * Start a custom local test immediately (Used for PYQs)
     */
    const startCustomTest = useCallback((questions, testName = 'Custom Test') => {
        setIsGeneratingTest(true);
        try {
            const duration = questions.length * 1.5 * 60; // 1.5 mins per question
            setupTestSession(questions, duration);
            setActiveTestName(testName);
            setActiveTestId(`custom-${Date.now()}`);

            // Initialize History in Backend
            if (auth.currentUser) {
                testService.initTestSession(auth.currentUser.uid, `custom-${Date.now()}`, testName, questions);
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
            // 1. Setup Local State
            const durationSeconds = (testData.duration || 60) * 60;

            // Format questions — ensure both `text` and `question` fields exist for
            // rendering compatibility. Convert string correctAnswer → option index so
            // scoring (which stores answers as indices) works correctly.
            const questions = testData.questions.map((q, idx) => {
                const options = q.options || [];
                // correctAnswer from Firestore is a string (the correct option text).
                // selectAnswer() records the selected *index*, so we must convert.
                const correctAnswerIndex = options.indexOf(q.correctAnswer);
                return {
                    id: q.id || `inst-${idx}`,
                    text: q.text,                   // used by storage / formatters
                    question: q.text,               // used by QuestionCard renderer
                    options,
                    correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
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
                testService.initTestSession(auth.currentUser.uid, testData.id, testData.title, questions);
            }
            return true;
        } catch (error) {
            logger.error('Error starting Institution test:', error);
            return false;
        } finally {
            setIsGeneratingTest(false);
        }
    }, []);

    /**
     * Submit the test and calculate results
     */
    const submitTest = useCallback(async (reasonInput = null) => {
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
                    }
                );

                // Update User Stats (Side Effect)
                const { updateUserStats } = await import('../../../services/userService');
                const xpGained = await updateUserStats(auth.currentUser.uid, results, activeTest, answers);

                // Update XP history
                await testService.updateTestXP(auth.currentUser.uid, testId, xpGained);

                // Invalidate Cache
                const { removeFromCache } = await import('../../../services/cacheService');
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
