import React from 'react';
import { Clock, CornerDownLeft, Maximize2, Minimize2 } from 'lucide-react';
import { formatTime } from '../../utils/helpers';

/**
 * TestHeader Component
 * Header for the active test view, showing timer, progress, and controls.
 */
export const TestHeader = ({
    testLength,
    timeLeft,
    isZenMode,
    toggleZenMode,
    onExit,
    onSubmit
}) => {
    const isLowTime = timeLeft < 300;

    return (
        <header className={`flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b transition-all duration-300 ${isZenMode ? 'border-transparent bg-white/50 backdrop-blur-sm fixed top-0 w-full z-50 hover:bg-white hover:shadow-md' : 'border-slate-200 bg-white z-20'}`}>

            {/* Left: Exit + Title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                    onClick={onExit}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-transform hover:-translate-x-1 shrink-0"
                    title="Exit Test"
                >
                    <CornerDownLeft size={18} />
                </button>
                <div className="min-w-0">
                    <h2 className={`font-bold text-indigo-950 text-xs sm:text-sm truncate transition-opacity ${isZenMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                        <span className="hidden xs:inline">{testLength} Questions</span>
                        <span className="xs:hidden">Q {testLength}</span>
                    </h2>
                </div>
            </div>

            {/* Right: Timer + Controls */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">

                {/* Timer — always visible except Zen Mode */}
                {!isZenMode && (
                    <div className={`flex items-center gap-1 sm:gap-2 font-bold bg-slate-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-100 ${isLowTime ? 'border-red-200 bg-red-50' : ''}`}>
                        <Clock size={13} className={isLowTime ? 'text-red-500 animate-pulse' : 'text-[#2278B0]'} />
                        <span className={`text-xs sm:text-xs tabular-nums ${isLowTime ? 'text-red-600' : 'text-slate-700'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                )}

                {/* Zen Mode Toggle */}
                <button
                    onClick={toggleZenMode}
                    className={`p-2 sm:px-3 sm:py-2 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all ${isZenMode
                        ? 'bg-indigo-950 text-white border-indigo-950 shadow-lg'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
                    title={isZenMode ? 'Exit Zen Mode' : 'Zen Mode'}
                >
                    {isZenMode
                        ? <Minimize2 size={14} />
                        : <Maximize2 size={14} />
                    }
                    <span className="hidden sm:inline">{isZenMode ? 'Exit Zen' : 'Zen Mode'}</span>
                </button>

                {/* Submit — only outside Zen Mode */}
                {!isZenMode && (
                    <button
                        onClick={onSubmit}
                        className="bg-[#2278B0] text-white px-2.5 sm:px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#1b5f8a] shadow-md shadow-[#2278B0]/20 transition-all hover:shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        <span className="hidden sm:inline">Submit Test</span>
                        <span className="sm:hidden">Submit</span>
                    </button>
                )}
            </div>
        </header>
    );
};

