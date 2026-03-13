import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
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
    const [showBlurBanner, setShowBlurBanner] = useState(false);
    const hasAutoSubmitted = useRef(false);
    const blurBannerTimeout = useRef(null);

    // ─── Bug Fix: Auto-submit test when timer reaches 0 ─────────────
    useEffect(() => {
        if (timeLeft <= 0 && !hasAutoSubmitted.current && test) {
            hasAutoSubmitted.current = true;
            logger.info('Test auto-submitted: timer expired');
            endTest();
        }
    }, [timeLeft, test, endTest]);

    // ─── Bug Fix: Auto-terminate at 4 proctoring warnings (3 warnings + 1 strike) ───────────
    useEffect(() => {
        if (warningCount >= 4 && !hasAutoSubmitted.current) {
            hasAutoSubmitted.current = true;
            logger.warn('Test auto-terminated: 4 proctoring violations');
            endTest('Terminated due to multiple tab switches');
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
                onSubmit={endTest}
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Question Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-10 lg:py-6 relative">
                    <QuestionCard
                        question={safeQuestion}
                        currentIndex={currentIndex}
                        totalQuestions={test.length}
                        selectedAnswer={answers[safeQuestion.id]}
                        isMarked={markedForReview.has(safeQuestion.id)}
                        onSelectAnswer={selectAnswer}
                        onToggleMark={toggleMarkForReview}
                        isZenMode={isZenMode}
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

            {/* Footer Nav */}
            <footer className="border-t border-slate-200 bg-white px-3 sm:px-6 lg:px-10 py-3 sm:py-4 flex justify-between items-center shrink-0">
                <button
                    onClick={goToPrev}
                    disabled={currentIndex === 0}
                    className="px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 text-sm active:scale-95 transition-all"
                >
                    <ChevronDown className="rotate-90" size={16} />
                    <span className="hidden xs:inline">Previous</span>
                </button>
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Always show Submit button in Zen Mode for easy access, or when on the last question everywhere */}
                    {(isZenMode || isLastQuestion) && (
                        <button
                            onClick={() => endTest()}
                            className="px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 flex items-center gap-1.5 sm:gap-2 text-sm active:scale-95 transition-all"
                        >
                            <span className="hidden sm:inline">Submit Test</span>
                            <span className="sm:hidden">Submit</span>
                        </button>
                    )}

                    {!isLastQuestion && (
                        <button
                            onClick={goToNext}
                            className="px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-[#2278B0] text-white font-bold hover:bg-[#1b5f8a] shadow-lg shadow-[#2278B0]/20 flex items-center gap-1.5 sm:gap-2 text-sm active:scale-95 transition-all"
                        >
                            <span className="hidden xs:inline">Next</span> <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </footer>
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
                                onClick={() => { setShowExitModal(false); endTest(); }}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-600/20"
                            >
                                Exit & Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
