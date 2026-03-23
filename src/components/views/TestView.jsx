import React, { useEffect, useState, useRef, useCallback } from 'react';
import { TestHeader } from '../test/TestHeader';
import { QuestionCard } from '../test/QuestionCard';
import QuestionPalette from '../test/QuestionPalette';
import logger from '../../utils/logger';

/**
 * TestView Component
 * Interactive MCQ test interface with timer, navigation, and review marking
 */
const TestView = ({
    test,
    currentIndex,
    answers,
    markedForReview,
    timeLeft,
    currentQuestion,
    goToNext,
    goToPrev,
    goToQuestion,
    selectAnswer,
    toggleMarkForReview,
    endTest,
    isZenMode,
    toggleZenMode,
}) => {
    const [warningCount, setWarningCount] = useState(0);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showBlurBanner, setShowBlurBanner] = useState(false);
    const hasAutoSubmitted = useRef(false);
    const blurBannerTimeout = useRef(null);
    const questionScrollRef = useRef(null);

    // Scroll to top of question content when question changes
    useEffect(() => {
        if (questionScrollRef.current) {
            questionScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentIndex]);

    // ─── Bug Fix: Auto-submit test when timer reaches 0 ─────────────
    useEffect(() => {
        if (timeLeft <= 0 && !hasAutoSubmitted.current && test) {
            hasAutoSubmitted.current = true;
            logger.info('Test auto-submitted: timer expired');
            endTest(null, warningCount);
        }
    }, [timeLeft, test, endTest, warningCount]);

    // ─── Bug Fix: Auto-terminate at 4 proctoring warnings (3 warnings + 1 strike) ───────────
    useEffect(() => {
        if (warningCount >= 4 && !hasAutoSubmitted.current) {
            hasAutoSubmitted.current = true;
            logger.warn('Test auto-terminated: 4 proctoring violations');
            endTest('Terminated due to multiple tab switches', warningCount);
        }
    }, [warningCount, endTest]);

    const lastZenToggleTime = useRef(0);

    // Track when Zen Mode was toggled to prevent false proctoring flags during fullscreen transition
    useEffect(() => {
        lastZenToggleTime.current = Date.now();
    }, [isZenMode]);

    // Proctoring: Trigger warning modal on tab switch + pre-emptive blur warning
    useEffect(() => {
        const handleVisibilityChange = () => {
            // Ignore visibility changes within 1.5 seconds of toggling Zen Mode (fullscreen transition)
            if (Date.now() - lastZenToggleTime.current < 1500) {
                logger.info('Ignored tab switch - Zen mode transitioning');
                return;
            }

            if (document.hidden) {
                // Tab is now hidden — increment warning and show modal on return
                setWarningCount(prev => prev + 1);
                setShowWarningModal(true);
                setShowBlurBanner(false); // clear blur banner once they've left
            } else {
                // They came back — hide blur banner
                setShowBlurBanner(false);
            }
        };

        // window blur: fires the INSTANT the window loses focus (before visibilitychange)
        const handleWindowBlur = () => {
            if (Date.now() - lastZenToggleTime.current < 1500) return;
            setShowBlurBanner(true);
            if (blurBannerTimeout.current) clearTimeout(blurBannerTimeout.current);
            blurBannerTimeout.current = setTimeout(() => setShowBlurBanner(false), 4000);
        };

        // window focus: fires when user returns to the window
        const handleWindowFocus = () => {
            setShowBlurBanner(false);
            if (blurBannerTimeout.current) clearTimeout(blurBannerTimeout.current);
        };

        // Mouse leaving the viewport (heading for tab bar or another window)
        const handleMouseLeave = (e) => {
            if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
                if (Date.now() - lastZenToggleTime.current < 1500) return;
                setShowBlurBanner(true);
                if (blurBannerTimeout.current) clearTimeout(blurBannerTimeout.current);
                blurBannerTimeout.current = setTimeout(() => setShowBlurBanner(false), 3000);
            }
        };

        const handleMouseEnter = () => {
            setShowBlurBanner(false);
            if (blurBannerTimeout.current) clearTimeout(blurBannerTimeout.current);
        };

        // Keyboard shortcut detection — fires BEFORE the browser acts on the shortcut
        const handleKeyDown = (e) => {
            if (Date.now() - lastZenToggleTime.current < 1500) return;

            const isSwitchShortcut =
                (e.ctrlKey && e.key === 'Tab') ||        // Ctrl+Tab  (next browser tab)
                (e.ctrlKey && e.shiftKey && e.key === 'Tab') || // Ctrl+Shift+Tab (prev tab)
                (e.altKey && e.key === 'Tab') ||          // Alt+Tab   (switch app - Windows/Linux)
                (e.metaKey && e.key === 'Tab') ||         // Cmd+Tab   (switch app - macOS)
                (e.ctrlKey && e.key === 'w') ||           // Ctrl+W    (close tab)
                (e.metaKey && e.key === 'w') ||           // Cmd+W     (close tab - macOS)
                e.key === 'Meta' || e.key === 'Super';    // Windows/Super key pressed alone

            if (isSwitchShortcut) {
                setShowBlurBanner(true);
                if (blurBannerTimeout.current) clearTimeout(blurBannerTimeout.current);
                blurBannerTimeout.current = setTimeout(() => setShowBlurBanner(false), 4000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('mouseenter', handleMouseEnter);
            document.removeEventListener('keydown', handleKeyDown);
            if (blurBannerTimeout.current) clearTimeout(blurBannerTimeout.current);
        };
    }, []);

    // Proctoring: Prevent accidental refresh/close
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "Are you sure you want to leave? Your test progress will be lost.";
            return e.returnValue;
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    // ─── Question Schema Validation ──────────────────────────────────
    const isValidQuestion = useCallback((q) => {
        return q && typeof q.text === 'string' && q.text.length > 0
            && Array.isArray(q.options) && q.options.length >= 2
            && typeof q.correctAnswer === 'number';
    }, []);

    if (!test || !currentQuestion) {
        return <div className="text-center p-10">Loading test...</div>;
    }

    // Skip malformed questions gracefully
    const safeQuestion = isValidQuestion(currentQuestion)
        ? currentQuestion
        : { ...currentQuestion, text: currentQuestion?.text || 'Question unavailable', options: currentQuestion?.options || ['N/A', 'N/A', 'N/A', 'N/A'], correctAnswer: 0 };

    const isLastQuestion = currentIndex === test.length - 1;


    return (
        <div className={`flex flex-col h-screen ${isZenMode ? 'p-0 bg-white' : ''}`}>

            {/* Pre-emptive Tab Switch Warning Banner */}
            {showBlurBanner && (
                <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border-2 border-orange-400">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl animate-pulse">🚨</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Don't Leave the Test!</h3>
                        <p className="text-slate-600 mb-4 font-medium">
                            Switching tabs or windows is <span className="text-red-600 font-bold">strictly monitored</span>.
                        </p>
                        <div className="bg-orange-50 p-4 rounded-xl mb-6 border border-orange-100">
                            <span className="block text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Warnings Used</span>
                            <span className="text-3xl font-black text-orange-700">{warningCount} / 3</span>
                            <p className="text-xs text-orange-500 mt-1 font-semibold">3 violations = Auto-termination</p>
                        </div>
                        <button
                            onClick={() => setShowBlurBanner(false)}
                            className="w-full bg-[#2278B0] hover:bg-[#1b5f8a] text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-[#2278B0]/20"
                        >
                            Stay in Test
                        </button>
                    </div>
                </div>
            )}

            {/* Test Header */}
            <TestHeader
                testLength={test.length}
                timeLeft={timeLeft}
                isZenMode={isZenMode}
                toggleZenMode={toggleZenMode}
                onExit={() => setShowExitModal(true)}
                onSubmit={() => setShowSubmitModal(true)}
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Question Area — fully self-contained card */}
                <div 
                    className={`flex-1 overflow-y-auto w-full px-2 sm:px-4 md:px-6 ${isZenMode ? 'pt-16 sm:pt-18 lg:pt-20 pb-4' : 'py-2 sm:py-4 lg:py-6'}`}
                >
                    <QuestionCard
                        question={safeQuestion}
                        selectedAnswer={answers[safeQuestion.id]}
                        onSelectAnswer={selectAnswer}
                        questionNumber={currentIndex + 1}
                        totalQuestions={test.length}
                        isMarked={markedForReview.has(safeQuestion.id)}
                        onToggleMark={() => toggleMarkForReview(safeQuestion.id)}
                        onPrev={goToPrev}
                        onNext={goToNext}
                        onSubmit={() => setShowSubmitModal(true)}
                        canGoPrev={currentIndex > 0}
                        isLastQuestion={isLastQuestion}
                        isZenMode={isZenMode}
                        scrollRef={questionScrollRef}
                    />
                </div>

                {/* Sidebar Nav (Desktop) */}
                <QuestionPalette
                    test={test}
                    currentIndex={currentIndex}
                    answers={answers}
                    markedForReview={markedForReview}
                    onNavigate={goToQuestion}
                    isZenMode={isZenMode}
                />
            </div>
            {/* Exit Confirmation Modal */}
            {showExitModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border-2 border-slate-200">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🚪</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Exit Test?</h3>
                        <p className="text-slate-600 mb-2 font-medium">
                            Are you sure you want to exit the test?
                        </p>
                        <p className="text-sm text-amber-600 font-semibold mb-6 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                            ⚠️ Your progress will be submitted and you cannot resume.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowExitModal(false)}
                                className="flex-1 py-3 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
                            >
                                Continue Test
                            </button>
                            <button
                                onClick={() => { setShowExitModal(false); endTest(null, warningCount); }}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-600/20"
                            >
                                Exit & Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Submit Confirmation Modal */}
            {showSubmitModal && (() => {
                const answeredCount = test ? test.filter(q => answers[q.id] !== undefined && !markedForReview.has(q.id)).length : 0;
                const reviewCount = test ? test.filter(q => answers[q.id] === undefined && markedForReview.has(q.id)).length : 0;
                const ansReviewCount = test ? test.filter(q => answers[q.id] !== undefined && markedForReview.has(q.id)).length : 0;
                const skippedCount = test ? test.length - (answeredCount + reviewCount + ansReviewCount) : 0;

                return (
                    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border-2 border-slate-200">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">✅</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Submit Test?</h3>
                            <p className="text-slate-600 mb-6 font-medium">
                                Are you sure you want to submit the test?
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full bg-white border border-slate-300 shadow-sm shrink-0" />
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">Skipped</div>
                                        <div className="text-lg font-black text-slate-700 leading-none">{skippedCount}</div>
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full bg-blue-600 shadow-sm shrink-0" />
                                    <div>
                                        <div className="text-[10px] font-bold text-blue-500 uppercase">Answered</div>
                                        <div className="text-lg font-black text-blue-700 leading-none">{answeredCount}</div>
                                    </div>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full bg-orange-100 border border-orange-200 shrink-0" />
                                    <div>
                                        <div className="text-[10px] font-bold text-orange-500 uppercase">Review</div>
                                        <div className="text-lg font-black text-orange-700 leading-none">{reviewCount}</div>
                                    </div>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full bg-purple-600 shadow-sm shrink-0" />
                                    <div>
                                        <div className="text-[10px] font-bold text-purple-500 uppercase">Attempted & Review</div>
                                        <div className="text-lg font-black text-purple-700 leading-none">{ansReviewCount}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSubmitModal(false)}
                                    className="flex-1 py-3 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
                                >
                                    Continue Test
                                </button>
                                <button
                                    onClick={() => { setShowSubmitModal(false); endTest(null, warningCount); }}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-green-600/20"
                                >
                                    Final Submit
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* Warning Modal */}
            {showWarningModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border-2 border-red-500">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Warning Issued!</h3>
                        <p className="text-slate-600 mb-6 font-medium">
                            You navigated away from the test window. This action has been recorded.
                        </p>
                        <div className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100">
                            <span className="block text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Warning Count</span>
                            <span className="text-3xl font-black text-red-700">{warningCount} / 3</span>
                        </div>
                        <button
                            onClick={() => setShowWarningModal(false)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all active:scale-95"
                        >
                            I Understand & Resume Test
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestView;
