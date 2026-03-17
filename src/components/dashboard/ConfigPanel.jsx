import React from 'react';
import { Layers, BarChart, History } from 'lucide-react';
import { DIFFICULTY_LEVELS, QUESTION_COUNTS } from '../../constants/appConstants';

/**
 * ConfigPanel Component
 * Configuration settings for test generation (Question Count, Difficulty, PYQ Blend).
 */
export const ConfigPanel = ({
    questionCount,
    setQuestionCount,
    difficulty,
    setDifficulty,
    pyqPercentage,
    setPyqPercentage
}) => {
    return (
        <div className="p-4 md:p-6 bg-[#1b1c31] border border-white/10 rounded-2xl shadow-xl space-y-6 h-full flex flex-col justify-center">
            {/* Row 1: Question Count */}
            <div className="flex flex-col gap-6">
                <div>
                    <label className="text-xs font-bold text-blue-100 uppercase mb-3 flex items-center gap-2">
                        <Layers size={14} /> Question Count
                    </label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {QUESTION_COUNTS.map(count => (
                            <button
                                key={count}
                                onClick={() => setQuestionCount(count)}
                                className={`py-2 rounded-lg font-bold text-sm border transition-all ${questionCount === count ? 'bg-white text-blue-600 border-white shadow-lg' : 'bg-transparent text-blue-100 border-white/30 hover:bg-white/10'}`}
                            >
                                {count}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Difficulty */}
                <div>
                    <label className="text-xs font-bold text-blue-100 uppercase mb-3 flex items-center gap-2">
                        <BarChart size={14} /> Difficulty
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        {DIFFICULTY_LEVELS.map(level => (
                            <button
                                key={level}
                                onClick={() => setDifficulty(level)}
                                className={`py-1.5 xl:py-2 px-1 rounded-lg font-bold text-[10px] xl:text-xs 2xl:text-sm border transition-all truncate block w-full outline-none ${difficulty === level ? 'bg-white text-blue-600 border-white shadow-lg' : 'bg-transparent text-blue-100 border-white/30 hover:bg-white/10'}`}
                                title={level}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 3: PYQ Blend Slider — full width, properly separated */}
            {/* <div className="pt-4 border-t border-white/10">
                <label className="text-xs font-bold text-blue-100 uppercase mb-2 flex items-center gap-2">
                    <History size={14} /> Include PYQs ({pyqPercentage}%)
                </label>
                <div className="pt-2 px-1">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={pyqPercentage}
                        onChange={(e) => setPyqPercentage(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-blue-200 uppercase mt-2 px-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100% (PYQs Only)</span>
                    </div>
                </div>
            </div> */}
        </div>
    );
};
