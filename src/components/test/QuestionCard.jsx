import React from 'react';
import { ChevronDown, ChevronRight, Flag } from 'lucide-react';

/**
 * QuestionCard Component
 * Fully self-contained card — responsive for all screen sizes.
 */
export const QuestionCard = ({
    question,
    selectedAnswer,
    onSelectAnswer,
    questionNumber,
    totalQuestions,
    isMarked,
    onToggleMark,
    onPrev,
    onNext,
    onSubmit,
    canGoPrev,
    isLastQuestion,
    isZenMode,
    scrollRef,
}) => {
    return (
        <div className="w-full max-w-6xl mx-auto h-full px-1 sm:px-2">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-0 sm:min-h-[calc(100vh-110px)] h-full overflow-hidden">

                {/* ── Top Bar: Question Number + Flag ── */}
                <div className="flex justify-between items-start px-4 sm:px-6 md:px-8 pt-5 sm:pt-6 pb-2">
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            Q {questionNumber} <span className="text-slate-300">/</span> {totalQuestions}
                        </span>
                        
                        {/* Tags: Subject, Topic, PYQ */}
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {(() => {
                                const tags = [];
                                // Pull from structured data
                                if (question.subject) tags.push(question.subject);
                                if (question.topic) tags.push(question.topic);
                                if (question.isPYQ) tags.push(question.pyqYear ? `PYQ ${question.pyqYear}` : 'PYQ');
                                
                                // Or fallback to `tags` object if set by generator
                                if (tags.length === 0 && Array.isArray(question.tags)) {
                                    question.tags.forEach(t => {
                                        if (typeof t === 'string') tags.push(t);
                                        else if (t.label) tags.push(t.label);
                                    });
                                }

                                return tags.map((t, idx) => (
                                    <span key={idx} className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                                        {t}
                                    </span>
                                ));
                            })()}
                        </div>
                    </div>

                    <button
                        onClick={onToggleMark}
                        className={`p-2 rounded-lg transition-all border text-sm ${isMarked
                            ? 'bg-orange-50 text-orange-500 border-orange-200'
                            : 'text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-500'
                            }`}
                        title={isMarked ? 'Unmark' : 'Mark for Review'}
                    >
                        <Flag size={14} fill={isMarked ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* ── Question Text + Options ── */}
                <div ref={scrollRef} className="px-4 sm:px-6 md:px-8 py-2 flex-1 overflow-y-auto">
                    <div className="mb-4 sm:mb-6 md:mb-8">
                        {(() => {
                            const parts = question.text
                                .replace(/\s*\([a-eA-E]\)\s+[^()]+(?=\s*\([a-eA-E]\)|$)/g, '')
                                .replace(/([a-z.?!])\s+(?=(?:\d{1,2}|[A-Fa-f])\.\s)/gi, '$1\n')
                                .replace(/([a-z.?'"])\s+(?=(Which of the|Which following|Which among|Which one|How many|Select the|Choose the|Identify the)\b)/gi, '$1\n')
                                .split(/\n|(?=(?:^|\s)(?:\d{1,2}|[A-Fa-f])\.\s)/g)
                                .map(p => p.trim())
                                .filter(Boolean);

                            const rawChunks = [];
                            let currentStmtGroup = [];

                            const flushCurrentStmts = () => {
                                if (currentStmtGroup.length > 0) {
                                    rawChunks.push({ type: 'statements', items: currentStmtGroup });
                                    currentStmtGroup = [];
                                }
                            };

                            parts.forEach(p => {
                                const isStatement = /^(?:\d{1,2}|[A-Fa-f])\./.test(p);
                                if (isStatement) {
                                    currentStmtGroup.push(p);
                                } else {
                                    flushCurrentStmts();
                                    rawChunks.push({ type: 'text', content: p });
                                }
                            });
                            flushCurrentStmts();

                            const blocks = [];
                            for (let i = 0; i < rawChunks.length; i++) {
                                const chunk = rawChunks[i];

                                // Intercept Match Lists (List I / List II)
                                if (chunk.type === 'text' && /^\s*List[-\s]?(?:I|1)\s*:?\s*$/i.test(chunk.content)) {
                                    if (
                                        i + 3 < rawChunks.length &&
                                        rawChunks[i + 1].type === 'statements' &&
                                        rawChunks[i + 2].type === 'text' && /^\s*List[-\s]?(?:II|2)\s*:?\s*$/i.test(rawChunks[i + 2].content) &&
                                        rawChunks[i + 3].type === 'statements'
                                    ) {
                                        blocks.push(
                                            <div key={`match-${i}`} className="mb-4 sm:mb-6 w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                                <div>
                                                    <div className="font-bold text-slate-800 mb-3 ml-1">{chunk.content}</div>
                                                    <div className="flex flex-col gap-2 sm:gap-3">
                                                        {rawChunks[i + 1].items.map((stmt, idx) => (
                                                            <div key={idx} className="pl-3 sm:pl-4 text-sm sm:text-base text-slate-700 font-medium bg-white p-2.5 sm:p-3 rounded-xl border-l-4 border-blue-300 shadow-sm flex gap-2 sm:gap-3 items-start h-full">
                                                                <span className="shrink-0 font-bold text-slate-500">{stmt.match(/^(?:\d{1,2}|[A-Fa-f])\./)[0]}</span>
                                                                <span className="flex-1">{stmt.replace(/^(?:\d{1,2}|[A-Fa-f])\.\s*/, '')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 mb-3 ml-1">{rawChunks[i + 2].content}</div>
                                                    <div className="flex flex-col gap-2 sm:gap-3">
                                                        {rawChunks[i + 3].items.map((stmt, idx) => (
                                                            <div key={idx} className="pl-3 sm:pl-4 text-sm sm:text-base text-slate-700 font-medium bg-white p-2.5 sm:p-3 rounded-xl border-l-4 border-blue-300 shadow-sm flex gap-2 sm:gap-3 items-start h-full">
                                                                <span className="shrink-0 font-bold text-slate-500">{stmt.match(/^(?:\d{1,2}|[A-Fa-f])\./)[0]}</span>
                                                                <span className="flex-1">{stmt.replace(/^(?:\d{1,2}|[A-Fa-f])\.\s*/, '')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                        i += 3;
                                        continue;
                                    }
                                }

                                if (chunk.type === 'statements') {
                                    // Side-by-side ONLY if exactly 4 statements and they are short
                                    const isShort4 = chunk.items.length === 4 && !chunk.items.some(s => s.split(' ').length > 12);
                                    blocks.push(
                                        <div key={`group-${i}`} className={`mb-3 sm:mb-4 w-full grid gap-3 sm:gap-4 ${isShort4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                            {chunk.items.map((stmt, idx) => (
                                                <div key={idx} className="pl-4 sm:pl-5 text-sm sm:text-base md:text-lg text-slate-700 font-medium bg-slate-50 p-3 sm:p-4 rounded-xl border-l-4 border-blue-200 flex gap-2 sm:gap-3 items-start h-full">
                                                    <span className="shrink-0 font-bold text-blue-800">{stmt.match(/^(?:\d{1,2}|[A-Fa-f])\./)[0]}</span>
                                                    <span className="flex-1">{stmt.replace(/^(?:\d{1,2}|[A-Fa-f])\.\s*/, '')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                } else {
                                    blocks.push(
                                        <div key={`p-${i}`} className="mb-3 sm:mb-4 text-base sm:text-lg md:text-xl font-serif text-slate-900 leading-relaxed">
                                            {chunk.content}
                                        </div>
                                    );
                                }
                            }
                            return blocks;
                        })()}
                    </div>

                    {/* ── Options ── */}
                    <div className={`grid ${question.options.some(opt => (opt?.split(' ').length || 0) > 8) ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2'} gap-3 sm:gap-4 md:gap-5`}>
                        {question.options.map((option, idx) => {
                            const isSelected = selectedAnswer === idx;
                            return (
                                <div
                                    key={idx}
                                    onClick={() => onSelectAnswer(question.id, idx)}
                                    className={`group relative p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${isSelected
                                        ? 'border-blue-600 bg-blue-50/50 shadow-sm shadow-blue-100'
                                        : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${isSelected
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-slate-300 text-slate-400 group-hover:border-blue-400 bg-white'
                                        }`}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className={`text-sm sm:text-base leading-relaxed pt-0.5 ${isSelected ? 'font-semibold text-blue-900' : 'text-slate-700'}`}>
                                        {option}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Bottom Nav ── */}
                <div className="flex justify-between items-center px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-t border-slate-100 mt-auto bg-slate-50/50">
                    <button
                        onClick={onPrev}
                        disabled={!canGoPrev}
                        className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1.5 text-sm transition-all active:scale-95"
                    >
                        <ChevronDown className="rotate-90" size={16} />
                        <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {isLastQuestion && (
                            <button
                                onClick={onSubmit}
                                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-sm text-sm sm:text-base flex items-center gap-1.5 active:scale-95 transition-all"
                            >
                                <span className="hidden sm:inline">Submit Test</span>
                                <span className="sm:hidden">Submit</span>
                            </button>
                        )}
                        {!isLastQuestion && (
                            <button
                                onClick={onNext}
                                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-[#2278B0] text-white font-bold hover:bg-[#1b5f8a] shadow-sm text-sm sm:text-base flex items-center gap-1.5 active:scale-95 transition-all"
                            >
                                <span className="hidden sm:inline">Next Question</span>
                                <span className="sm:hidden">Next</span>
                                <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
