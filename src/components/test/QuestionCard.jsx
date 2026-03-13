import React from 'react';
import { Flag, AlertTriangle } from 'lucide-react';

/**
 * QuestionCard Component
 * Displays a single question, its options, and associated controls.
 * 
 * @param {Object} props
 * @param {Object} props.question - The question object
 * @param {number} props.currentIndex - Index of the current question
 * @param {number} props.totalQuestions - Total number of questions
 * @param {number|null} props.selectedAnswer - Index of the selected option
 * @param {boolean} props.isMarked - Whether the question is marked for review
 * @param {function} props.onSelectAnswer - Callback when an option is selected
 * @param {function} props.onToggleMark - Callback to toggle mark for review
 * @param {boolean} props.isZenMode - Whether Zen Mode is active
 */
export const QuestionCard = ({
    question,
    currentIndex,
    totalQuestions,
    selectedAnswer,
    isMarked,
    onSelectAnswer,
    onToggleMark,
    isZenMode
}) => {
    // Extract standardized tags based on schema
    const pyqTag = question.tags?.find(t => t.type === 'pyq');
    const subjectTag = question.tags?.find(t => t.type === 'subject') || { type: 'subject', label: question.subject };
    const topicTag = question.tags?.find(t => t.type === 'topic') || { type: 'topic', label: question.topic };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Question Header & Tags */}
            <div className={`flex flex-col gap-3 mb-6 transition-all duration-300 ${isZenMode ? 'mt-16 sticky top-20 z-40 bg-white/80 backdrop-blur p-4 rounded-2xl shadow-sm border border-slate-100' : ''}`}>
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Question {currentIndex + 1} <span className="text-slate-300">/</span> {totalQuestions}
                        </span>

                        {/* Dynamic Tags Container */}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {pyqTag && (
                                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200 tracking-wider shadow-sm flex items-center gap-1">
                                    🏆 {pyqTag.label}
                                </span>
                            )}
                            {subjectTag?.label && (
                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100 tracking-wide">
                                    {subjectTag.label}
                                </span>
                            )}
                            {topicTag?.label && (
                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 tracking-wide line-clamp-1 max-w-[40vw] sm:max-w-[200px]" title={topicTag.label}>
                                    {topicTag.label}
                                </span>
                            )}
                            {question.difficulty && (
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border tracking-wide ${
                                    question.difficulty.toLowerCase() === 'hard' ? 'bg-red-50 text-red-600 border-red-100' :
                                    question.difficulty.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    'bg-green-50 text-green-600 border-green-100'
                                }`}>
                                    {question.difficulty}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onToggleMark(question.id)}
                            className={`p-2.5 rounded-xl transition-all border ${isMarked
                                ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-sm'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-500'
                                }`}
                            title={isMarked ? "Unmark" : "Mark for Review"}
                        >
                            <Flag size={16} fill={isMarked ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                {/* Question Text with Statement Support */}
                <div className="mb-6">
                    {question.text
                        .replace(/\s*\([a-eA-E]\)\s+[^()]+(?=\s*\([a-eA-E]\)|$)/g, '')
                        .replace(/([a-z.?!])\s+(?=\d{1,2}\.\s)/gi, '$1\n')
                        .replace(/([a-z.?'")])\s+(?=(Which of the|Which following|Which among|Which one|How many|Select the|Choose the|Identify the)\b)/gi, '$1\n')
                        .split(/\n|(?=(?:^|\s)\d{1,2}\.\s)/g)
                        .map((part, i) => {
                        const trimmed = part.trim();
                        const isStatement = /^\d{1,2}\./.test(trimmed);

                        if (!trimmed) return null;

                        return (
                            <div key={i} className={`mb-3 ${isStatement ? 'pl-4 text-slate-700 font-medium bg-slate-50 p-2 rounded-lg border-l-4 border-blue-200' : 'text-base sm:text-xl md:text-2xl font-serif text-slate-900 leading-relaxed'}`}>
                                {trimmed}
                            </div>
                        );
                    })}
                </div>

                {/* Options */}
                <div className={`grid ${question.options.some(opt => (opt?.split(' ').length || 0) > 8) ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                    {question.options.map((option, idx) => {
                        const isSelected = selectedAnswer === idx;
                        return (
                            <div
                                key={idx}
                                onClick={() => onSelectAnswer(question.id, idx)}
                                className={`group relative p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${isSelected
                                    ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-100'
                                    : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50'
                                    }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-sm font-bold transition-all ${isSelected
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-slate-300 text-slate-400 group-hover:border-blue-400 bg-white'
                                        }`}
                                >
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <span
                                    className={`text-base leading-relaxed pt-0.5 ${isSelected
                                        ? 'font-bold text-blue-900'
                                        : 'text-slate-700'
                                        }`}
                                >
                                    {option}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
