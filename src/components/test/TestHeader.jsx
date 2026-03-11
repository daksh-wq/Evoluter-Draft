import React from 'react';
import { Clock, CornerDownLeft } from 'lucide-react';
import { formatTime } from '../../utils/helpers';

/**
 * TestHeader Component
 * Header for the active test view, showing timer, progress, and controls.
 * 
 * @param {Object} props
 * @param {number} props.testLength - Total number of questions
 * @param {number} props.timeLeft - Remaining time in seconds
 * @param {boolean} props.isZenMode - Whether Zen Mode is active
 * @param {function} props.toggleZenMode - Callback to toggle Zen Mode
 * @param {function} props.onExit - Callback to exit the test
 * @param {function} props.onSubmit - Callback to submit the test
 */
export const TestHeader = ({
    testLength,
    timeLeft,
    isZenMode,
    toggleZenMode,
    onExit,
    onSubmit
}) => {
    return (
        <header className={`flex items-center justify-between px-6 py-4 border-b transition-all duration-300 ${isZenMode ? 'border-transparent bg-white/50 backdrop-blur-sm fixed top-0 w-full z-50 hover:bg-white hover:shadow-md' : 'border-slate-200 bg-white z-20'}`}>
            <div className="flex items-center gap-4">
                <button
                    onClick={onExit}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-transform hover:-translate-x-1"
                    title="Exit Test"
                >
                    <CornerDownLeft size={20} />
                </button>
                <div>
                    <h2 className={`font-bold text-indigo-950 text-sm transition-opacity ${isZenMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                        {testLength} Questions Mock
                    </h2>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!isZenMode && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 mr-1">
                        <Clock size={14} className={timeLeft < 300 ? "text-red-500 animate-pulse" : "text-[#2278B0]"} />
                        <span className={timeLeft < 300 ? "text-red-600" : "text-slate-700"}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                )}
                <button
                    onClick={toggleZenMode}
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold transition-all ${isZenMode ? 'bg-indigo-950 text-white border-indigo-950 shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                    {isZenMode ? 'Exit Zen' : 'Zen Mode'}
                </button>
                {!isZenMode && (
                    <button
                        onClick={onSubmit}
                        className="bg-[#2278B0] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#1b5f8a] shadow-md shadow-[#2278B0]/20 transition-all hover:shadow-lg"
                    >
                        Submit Test
                    </button>
                )}
            </div>
        </header>
    );
};
