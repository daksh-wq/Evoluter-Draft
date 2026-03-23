import React, { useState } from 'react';
import { Menu, X, LayoutGrid } from 'lucide-react';

/**
 * QuestionPalette Component
 * Desktop: Fixed sidebar.
 * Mobile/Tablet: Hidden behind a floating button; slides up as a bottom drawer.
 */
const PaletteGrid = ({ test, currentIndex, answers, markedForReview, onNavigate, onClose }) => {
    const [filter, setFilter] = useState('ALL');

    const toggleFilter = (type) => {
        setFilter(f => f === type ? 'ALL' : type);
    };

    return (
        <>
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                {filter !== 'ALL' && (
                    <div className="mb-2 sm:mb-3 flex justify-end">
                        <button
                            onClick={() => setFilter('ALL')}
                            className="text-white hover:text-red-500 bg-red-500 hover:bg-red-50 p-1 sm:p-1.5 rounded-full transition-colors border border-slate-200"
                            title="Clear filter"
                        >
                            <X size={14} strokeWidth={3} />
                        </button>
                    </div>
                )}
                {/* More columns on mobile (e.g. 7 or 8) so the buttons become smaller squares */}
                <div className="grid grid-cols-7 sm:grid-cols-8 lg:grid-cols-5 gap-1.5 sm:gap-2 lg:gap-3">
                    {test.map((q, idx) => {
                        const isCurrent = idx === currentIndex;
                        const isAns = answers[q.id] !== undefined;
                        const isMarked = markedForReview.has(q.id);

                        if (filter === 'NOT_VISITED' && (isAns || isMarked)) return null;
                        if (filter === 'ANSWERED' && (!isAns || isMarked)) return null;
                        if (filter === 'REVIEW' && (isAns || !isMarked)) return null;
                        if (filter === 'ANS_REVIEW' && (!isAns || !isMarked)) return null;

                        let baseClass = "w-full aspect-square rounded-lg text-[10px] sm:text-xs font-bold border flex items-center justify-center relative transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer";
                        let colorClass = "bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-500";

                        if (isCurrent) colorClass = 'ring-2 ring-blue-500 border-blue-500 z-10 bg-blue-50 text-blue-700';
                        if (isAns) colorClass = 'bg-blue-600 text-white border-blue-600 shadow-blue-200';
                        if (isMarked) colorClass = 'bg-orange-100 text-orange-600 border-orange-200';
                        if (isAns && isMarked) colorClass = 'bg-purple-600 text-white border-purple-600 shadow-purple-200';

                        return (
                            <button
                                key={q.id}
                                onClick={() => { onNavigate(idx); if (onClose) onClose(); }}
                                className={`${baseClass} ${colorClass}`}
                            >
                                {idx + 1}
                                {isMarked && !isAns && (
                                    <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full border-2 border-white translate-x-1/4 -translate-y-1/4" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="p-3 sm:p-5 border-t border-slate-200 bg-white shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    <button
                        onClick={() => toggleFilter('NOT_VISITED')}
                        className={`flex items-center gap-1.5 p-1.5 sm:p-2 relative rounded-lg border shadow-sm transition-all active:scale-95 ${filter === 'NOT_VISITED' ? 'bg-slate-100 border-slate-300 ring-1 sm:ring-2 ring-slate-200 text-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white border border-slate-300 shadow-sm shrink-0" /> 
                        <span className="flex-1 text-left line-clamp-1">Not Visited</span>
                    </button>
                    <button
                        onClick={() => toggleFilter('ANSWERED')}
                        className={`flex items-center gap-1.5 p-1.5 sm:p-2 relative rounded-lg border shadow-sm transition-all active:scale-95 ${filter === 'ANSWERED' ? 'bg-blue-50 border-blue-300 ring-1 sm:ring-2 ring-blue-100 text-blue-900' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-200'}`}
                    >
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-600 shadow-sm shrink-0" /> 
                        <span className="flex-1 text-left line-clamp-1">Answered</span>
                    </button>
                    <button
                        onClick={() => toggleFilter('REVIEW')}
                        className={`flex items-center gap-1.5 p-1.5 sm:p-2 relative rounded-lg border shadow-sm transition-all active:scale-95 ${filter === 'REVIEW' ? 'bg-orange-50 border-orange-300 ring-1 sm:ring-2 ring-orange-100 text-orange-900' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-orange-200'}`}
                    >
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-100 border border-orange-200 shrink-0" /> 
                        <span className="flex-1 text-left line-clamp-1">Review</span>
                    </button>
                    <button
                        onClick={() => toggleFilter('ANS_REVIEW')}
                        className={`flex items-center gap-1.5 p-1.5 sm:p-2 relative rounded-lg border shadow-sm transition-all active:scale-95 ${filter === 'ANS_REVIEW' ? 'bg-purple-50 border-purple-300 ring-1 sm:ring-2 ring-purple-100 text-purple-900' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-purple-200'}`}
                    >
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-purple-600 shadow-sm shrink-0" /> 
                        <span className="flex-1 text-left line-clamp-1">Ans+Review</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export const QuestionPalette = ({
    test,
    currentIndex,
    answers,
    markedForReview,
    onNavigate,
    isZenMode
}) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const answeredCount = Object.keys(answers).length;

    return (
        <>
            {/* ─── Desktop Sidebar ─────────────────────────────── */}
            <div className={`border-l border-slate-200 bg-slate-50/50 backdrop-blur-sm hidden lg:flex flex-col transition-all duration-300 shrink-0 ${isZenMode ? 'translate-x-full absolute right-0 h-full z-40' : (isCollapsed ? 'w-16' : 'w-80')}`}>
                {/* Header (Collapsed via conditional rendering of text) */}
                <div className={`p-4 sm:p-6 border-b border-slate-200/50 font-bold text-slate-800 flex items-center bg-white/50 shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <span
                        className={`flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors ${isCollapsed ? '' : 'text-sm'}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Open Question Palette" : "Collapse Palette"}
                    >
                        <Menu size={20} className="text-blue-500 hover:scale-110 transition-transform" />
                        {!isCollapsed && <span>Question Palette</span>}
                    </span>
                    {!isCollapsed && (
                        <span className="text-[10px] font-extrabold bg-slate-200/50 text-slate-600 px-2 py-1 rounded-md uppercase tracking-wide">
                            {answeredCount}/{test.length} Done
                        </span>
                    )}
                </div>

                {/* Grid Content - Fade out/hide when collapsed */}
                <div className={`flex-1 flex flex-col min-h-0 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 invisible overflow-hidden' : 'opacity-100'}`}>
                    <PaletteGrid
                        test={test}
                        currentIndex={currentIndex}
                        answers={answers}
                        markedForReview={markedForReview}
                        onNavigate={onNavigate}
                    />
                </div>
            </div>

            {/* ─── Mobile: Floating Trigger Button ─────────────── */}
            {!isZenMode && (
                <button
                    onClick={() => setMobileOpen(true)}
                    className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 bg-indigo-950 text-white rounded-full shadow-2xl shadow-indigo-900/40 flex items-center justify-center active:scale-95 transition-all"
                    title="Question Palette"
                >
                    <LayoutGrid size={20} />
                    {/* Answered badge */}
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                        {answeredCount}
                    </span>
                </button>
            )}

            {/* ─── Mobile: Bottom Drawer ────────────────────────── */}
            {mobileOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setMobileOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[70dvh] animate-in slide-in-from-bottom-10 duration-300">
                        {/* Drawer Handle + Header */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                                <LayoutGrid size={16} className="text-blue-500" />
                                <span className="text-sm">Question Palette</span>
                                <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wide ml-1">
                                    {answeredCount}/{test.length}
                                </span>
                            </div>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 active:scale-95 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <PaletteGrid
                            test={test}
                            currentIndex={currentIndex}
                            answers={answers}
                            markedForReview={markedForReview}
                            onNavigate={onNavigate}
                            onClose={() => setMobileOpen(false)}
                        />
                    </div>
                </>
            )}
        </>
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
