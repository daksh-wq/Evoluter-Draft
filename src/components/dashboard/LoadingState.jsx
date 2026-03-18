import React, { useState, useEffect } from 'react';
import { Zap, Lightbulb } from 'lucide-react';
import { getRandomFact } from '../../constants/facts';

/**
 * LoadingState Component
 * Displays progress and interesting facts while AI generates the test.
 * 
 * @param {Object} props
 * @param {boolean} props.isGenerating - Whether generation is in progress
 * @param {number} props.progress - Current progress percentage (0-100)
 * @param {string} props.topic - The topic being generated
 */
export const LoadingState = ({ isGenerating, progress, topic }) => {
    const [fact, setFact] = useState('');
    const [fade, setFade] = useState(false);

    useEffect(() => {
        if (!isGenerating) return;

        const initTimeout = setTimeout(() => {
            setFact(getRandomFact(topic)); // Initial fact
        }, 0);

        const interval = setInterval(() => {
            setFade(true);
            setTimeout(() => {
                setFact(getRandomFact(topic));
                setFade(false);
            }, 300); // Wait for fade out
        }, 4000); // Change every 4s

        return () => {
            clearTimeout(initTimeout);
            clearInterval(interval);
        };
    }, [isGenerating, topic]);

    if (!isGenerating) return null;

    return (
        <div className="mt-6 bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider flex items-center gap-2">
                    <Zap size={12} className="text-yellow-400" /> Prep Insight
                </span>
                <span className="text-xs font-bold text-white font-mono">{progress}%</span>
            </div>

            <div className={`transition-opacity duration-300 min-h-[40px] flex items-center ${fade ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-sm text-white font-medium leading-relaxed opacity-90">
                    <Lightbulb size={14} className="inline mr-2 text-yellow-300 mb-0.5" />
                    {fact}
                </p>
            </div>

            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-3 relative">
                {/* Shimmer effect */}
                <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full -translate-x-full animate-[shimmer_1.5s_infinite]" />

                <div
                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};
