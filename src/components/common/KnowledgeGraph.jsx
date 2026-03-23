import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';

/**
 * KnowledgeGraph Component
 * The "Hex-Grid" Honeycomb design. Interlocking hexagon blocks showing subject mastery.
 */
const KnowledgeGraph = ({ mastery = {} }) => {
    // Summary stats
    const stats = useMemo(() => {
        const scores = Object.values(mastery);
        if (scores.length === 0) return { avg: 0, strong: 0, weak: 0, total: 0 };
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
            avg: Math.round(avg),
            strong: scores.filter(s => s >= 80).length,
            weak: scores.filter(s => s < 50).length,
            total: scores.length
        };
    }, [mastery]);

    // Format data and calculate chunks for Honeycomb
    const chunks = useMemo(() => {
        const topics = Object.entries(mastery).map(([topic, score]) => ({
            subject: topic,
            score: Math.round(score),
        }));
        
        if (topics.length === 0) return [];
        
        // Sort alphabetically or however you prefer. Here we do highest score to middle roughly.
        topics.sort((a, b) => b.score - a.score);

        // Group into interlocking rows
        const len = topics.length;
        if (len === 7) return [[topics[0], topics[1]], [topics[2], topics[3], topics[4]], [topics[5], topics[6]]];
        if (len === 6) return [[topics[0], topics[1], topics[2]], [topics[3], topics[4], topics[5]]];
        if (len === 5) return [[topics[0], topics[1]], [topics[2], topics[3], topics[4]]];
        if (len === 4) return [[topics[0], topics[1]], [topics[2], topics[3]]];
        if (len === 3) return [[topics[0], topics[1], topics[2]]];
        return [topics];
    }, [mastery]);

    if (chunks.length === 0) {
        return (
            <div className="h-64 w-full bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-slate-400 border border-slate-200">
                <div className="w-14 h-14 bg-slate-200/50 rounded-2xl flex items-center justify-center mb-3">
                    <Brain size={24} className="text-slate-400" />
                </div>
                <p className="font-semibold text-slate-500 text-sm">No analysis available</p>
                <p className="text-xs mt-1 text-slate-400">Take a diagnostic test to initialize your hex-grid</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Topics', value: stats.total, color: 'text-slate-700' },
                    { label: 'Avg Mastery', value: `${stats.avg}%`, color: 'text-[#2278B0]' },
                    { label: 'Strong', value: stats.strong, color: 'text-emerald-600' },
                    { label: 'Weak', value: stats.weak, color: 'text-amber-600' },
                ].map((s) => (
                    <div key={s.label} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center shadow-sm">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{s.label}</div>
                        <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Honeycomb Grid Container */}
            <div className="relative w-full overflow-hidden bg-[#0B1121] rounded-3xl shadow-[inset_0_0_120px_rgba(0,0,0,1)] flex items-center justify-center py-10 sm:py-16 border border-slate-800/80">
                
                {/* Tactical grid background */}
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                />

                <div className="flex flex-col items-center justify-center relative z-10 w-full max-w-2xl px-2">
                    {chunks.map((row, rIdx) => (
                        <div 
                            key={`row-${rIdx}`} 
                            className="flex justify-center" 
                            style={{ 
                                marginTop: rIdx > 0 ? '-24px' : '0', // Stagger negative margin to interlock hexes. Adjust as needed.
                                zIndex: chunks.length - rIdx // prevent overlap clipping from bottom items
                            }}
                        >
                            {row.map((item, iIdx) => {
                                const delay = (rIdx * 3 + iIdx) * 0.1;
                                return (
                                    <Hexagon 
                                        key={item.subject} 
                                        subject={item.subject} 
                                        score={item.score} 
                                        delay={delay} 
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Extracted Hexagon Component
const Hexagon = ({ subject, score, delay }) => {
    // Dynamic styling based on score
    let borderColor = 'rgba(59, 130, 246, 0.4)'; // Blue (Learning)
    let glowingLiquid = 'rgba(59, 130, 246, 0.8)'; 
    let baseDark = '#172554'; // indigo-950
    // let textStatus = 'text-blue-300';

    if (score >= 80) {
        borderColor = 'rgba(16, 185, 129, 0.4)'; // Emerald Mastered
        glowingLiquid = 'rgba(16, 185, 129, 0.85)';
        baseDark = '#064e3b'; // emerald-950
    } else if (score < 50) {
        borderColor = 'rgba(239, 68, 68, 0.4)'; // Red Weak
        glowingLiquid = 'rgba(239, 68, 68, 0.85)';
        baseDark = '#450a0a'; // red-950
    }

    const hexClipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
            className="group relative cursor-pointer"
            style={{ 
                width: '100px', 
                height: '114px', 
                margin: '0 4px', // Space horizontally between hexes
            }}
            whileHover={{ scale: 1.08, zIndex: 50 }}
        >
            {/* Outer Box serving as the colored Border */}
            <div 
                className="absolute inset-0 transition-transform duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                style={{
                    clipPath: hexClipPath,
                    backgroundColor: borderColor,
                }}
            >
                {/* Inner Dark Hex */}
                <div
                    className="absolute top-[2px] left-[2px] right-[2px] bottom-[2px]"
                    style={{
                        clipPath: hexClipPath,
                        backgroundColor: '#0f172a', // Very dark slate inside
                    }}
                >
                    {/* Underlying Base Glow (Empty space) */}
                    <div className="absolute inset-0" style={{ backgroundColor: baseDark, opacity: 0.3 }} />

                    {/* Animated Liquid Fill tracking the score % */}
                    <motion.div 
                        initial={{ height: '0%' }}
                        animate={{ height: `${score}%` }}
                        transition={{ delay: delay + 0.3, duration: 1.5, ease: "easeOut" }}
                        className="absolute bottom-0 left-0 right-0 w-full"
                        style={{ 
                            backgroundColor: glowingLiquid,
                            boxShadow: `0 -5px 15px ${glowingLiquid}`
                        }}
                    >
                        {/* Shimmer effect inside the liquid */}
                        <div className="absolute inset-0 opacity-30 bg-gradient-to-t from-transparent to-white pointer-events-none mix-blend-overlay" />
                    </motion.div>

                    {/* Text Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none z-10 transition-transform duration-300 group-hover:scale-110">
                        <span className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {score}%
                        </span>
                        <span className="text-[8px] sm:text-[9px] uppercase font-bold mt-0.5 text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight max-w-[90%] break-words">
                            {subject}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Hover overlay highlight ring */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-screen pointer-events-none"
                 style={{ clipPath: hexClipPath, boxShadow: `inset 0 0 20px ${glowingLiquid}` }} 
            />
        </motion.div>
    );
};

export default React.memo(KnowledgeGraph);
