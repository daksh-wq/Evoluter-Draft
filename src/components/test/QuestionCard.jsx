import React from 'react';

/**
 * QuestionCard Component
 * Displays a single question, its options, and associated controls.
 */
export const QuestionCard = ({
    question,
    selectedAnswer,
    onSelectAnswer
}) => {
    return (
        <div className="max-w-4xl mx-auto">

            {/* Question Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                {/* Question Text with Statement Support */}
                <div className="mb-6">
                    {question.text
                        .replace(/\s*\([a-eA-E]\)\s+[^()]+(?=\s*\([a-eA-E]\)|$)/g, '')
                        .replace(/([a-z.?!])\s+(?=(?:\d{1,2}|[A-Fa-f])\.\s)/gi, '$1\n')
                        .replace(/([a-z.?'")])\s+(?=(Which of the|Which following|Which among|Which one|How many|Select the|Choose the|Identify the)\b)/gi, '$1\n')
                        .split(/\n|(?=(?:^|\s)(?:\d{1,2}|[A-Fa-f])\.\s)/g)
                        .map((part, i) => {
                            const trimmed = part.trim();
                            const isStatement = /^(?:\d{1,2}|[A-Fa-f])\./.test(trimmed);

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
