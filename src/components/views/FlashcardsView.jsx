import React from 'react';
import { Sparkles, Brain } from 'lucide-react';

const FlashcardsView = () => {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-[#2278B0] rounded-3xl flex items-center justify-center shadow-lg shadow-[#2278B0]/20 mb-8 rotate-3">
                <Sparkles size={48} className="text-white" />
            </div>

            <h1 className="text-4xl font-extrabold text-indigo-950 tracking-tight mb-4">
                Flashcard Blitz
            </h1>

            <p className="text-xl text-slate-500 max-w-md text-center leading-relaxed mb-10">
                Sharpen your memory with rapid-fire revision cards. This feature is under active construction by our engineers.
            </p>

            <div className="flex gap-4">
                <button
                    disabled
                    className="px-6 py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed flex items-center gap-2"
                >
                    <Brain size={20} />
                    Beta Access Soon
                </button>
            </div>
        </div>
    );
};

export default FlashcardsView;
