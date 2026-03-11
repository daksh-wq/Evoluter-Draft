import React from 'react';
import { Menu } from 'lucide-react';

/**
 * QuestionPalette Component
 * Sidebar navigation for jumping between questions and seeing their status.
 * 
 * @param {Object} props
 * @param {Array} props.test - Array of all questions
 * @param {number} props.currentIndex - Index of the current question
 * @param {Object} props.answers - Map of question IDs to selected answers
 * @param {Set} props.markedForReview - Set of marked question IDs
 * @param {function} props.onNavigate - Callback to navigate to a specific question index
 * @param {boolean} props.isZenMode - Whether Zen Mode is active
 */
export const QuestionPalette = ({
    test,
    currentIndex,
    answers,
    markedForReview,
    onNavigate,
    isZenMode
}) => {
    return (
        <div className={`w-80 border-l border-slate-200 bg-slate-50/50 backdrop-blur-sm hidden lg:flex flex-col transition-all duration-300 ${isZenMode ? 'translate-x-full absolute right-0 h-full z-40' : ''}`}>
            <div className="p-6 border-b border-slate-200/50 font-bold text-slate-800 flex justify-between items-center bg-white/50">
                <span className="flex items-center gap-2 text-sm">
                    <Menu size={16} className="text-blue-500" />
                    Question Palace
                </span>
                <span className="text-[10px] font-extrabold bg-slate-200/50 text-slate-600 px-2 py-1 rounded-md uppercase tracking-wide">
                    {Object.keys(answers).length}/{test.length} Done
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                <div className="grid grid-cols-5 gap-3">
                    {test.map((q, idx) => {
                        const isCurrent = idx === currentIndex;
                        const isAns = answers[q.id] !== undefined;
                        const isMarked = markedForReview.has(q.id);

                        let baseClass = "w-10 h-10 rounded-xl text-xs font-bold border flex items-center justify-center relative transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5";
                        let colorClass = "bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-500";

                        if (isCurrent) colorClass = 'ring-2 ring-blue-500 border-blue-500 z-10 bg-blue-50 text-blue-700';
                        if (isAns) colorClass = 'bg-blue-600 text-white border-blue-600 shadow-blue-200';
                        if (isMarked) colorClass = 'bg-orange-100 text-orange-600 border-orange-200';
                        if (isAns && isMarked) colorClass = 'bg-purple-600 text-white border-purple-600 shadow-purple-200';

                        return (
                            <button
                                key={q.id}
                                onClick={() => onNavigate(idx)}
                                className={`${baseClass} ${colorClass}`}
                            >
                                {idx + 1}
                                {isMarked && !isAns && (
                                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white translate-x-1/4 -translate-y-1/4" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="p-6 border-t border-slate-200 bg-white/50">
                <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-white border border-slate-300 shadow-sm" /> Not Visited
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm" /> Answered
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200" /> Review
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-600 shadow-sm" /> Ans+Review
                    </div>
                </div>
            </div>
        </div>
    );
};

// Memoize to prevent re-renders unless relevant props change
export default React.memo(QuestionPalette, (prevProps, nextProps) => {
    return (
        prevProps.currentIndex === nextProps.currentIndex &&
        Object.keys(prevProps.answers).length === Object.keys(nextProps.answers).length &&
        prevProps.markedForReview.size === nextProps.markedForReview.size &&
        prevProps.test.length === nextProps.test.length &&
        prevProps.isZenMode === nextProps.isZenMode
    );
});

