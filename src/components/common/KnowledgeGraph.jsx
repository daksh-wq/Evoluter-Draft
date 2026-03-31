import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

/**
 * KnowledgeGraph Component
 * Honeycomb hex-grid with red/yellow/green mastery zones.
 * Overall palette matches the #2278B0 brand colour.
 */
const KnowledgeGraph = ({ mastery = {} }) => {
    const stats = useMemo(() => {
        const scores = Object.values(mastery);
        if (scores.length === 0) return { avg: 0, strong: 0, mid: 0, weak: 0, total: 0 };
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
            avg: Math.round(avg),
            strong: scores.filter(s => s >= 80).length,
            mid: scores.filter(s => s >= 50 && s < 80).length,
            weak: scores.filter(s => s < 50).length,
            total: scores.length,
        };
    }, [mastery]);

    const chunks = useMemo(() => {
        const topics = Object.entries(mastery)
            .map(([topic, score]) => ({ subject: topic, score: Math.round(score) }))
            .sort((a, b) => b.score - a.score);

        if (topics.length === 0) return [];
        const len = topics.length;
        // Honeycomb rule: adjacent rows MUST alternate item counts (N and N±1)
        // so hexagons from one row fall into the gaps of the next.
        if (len >= 9) return [
            [topics[0], topics[1]],
            [topics[2], topics[3], topics[4]],
            [topics[5], topics[6], topics[7], ...topics.slice(8)],
        ];
        if (len === 8) return [
            [topics[0], topics[1], topics[2]],
            [topics[3], topics[4]],
            [topics[5], topics[6], topics[7]],
        ];
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

    const statCards = [
        {
            label: 'Avg Score',
            value: `${stats.avg}%`,
            pct: stats.avg,
            bg: '#0d1f35',
            border: 'rgba(34,120,176,0.35)',
            valueColor: '#60b4ff',
            bar: '#2278B0',
        },
        {
            label: 'Mastered',
            value: stats.strong,
            pct: stats.total ? Math.round((stats.strong / stats.total) * 100) : 0,
            bg: '#0a2818',
            border: 'rgba(16,185,129,0.35)',
            valueColor: '#34d399',
            bar: '#10b981',
            badge: '\u2265 80%',
        },
        {
            label: 'Learning',
            value: stats.mid,
            pct: stats.total ? Math.round((stats.mid / stats.total) * 100) : 0,
            bg: '#271800',
            border: 'rgba(245,158,11,0.35)',
            valueColor: '#fbbf24',
            bar: '#f59e0b',
            badge: '50\u201379%',
        },
        {
            label: 'Weak',
            value: stats.weak,
            pct: stats.total ? Math.round((stats.weak / stats.total) * 100) : 0,
            bg: '#2a0a0a',
            border: 'rgba(239,68,68,0.35)',
            valueColor: '#f87171',
            bar: '#ef4444',
            badge: '< 50%',
        },
    ];

    return (
        <div className="w-full space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map((s) => (
                    <div
                        key={s.label}
                        className="rounded-2xl p-3 flex flex-col gap-1.5 shadow-sm border"
                        style={{ backgroundColor: s.bg, borderColor: s.border }}
                    >
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{s.label}</span>
                            {s.badge && (
                                <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                                    style={{ color: s.valueColor, borderColor: s.border, background: 'rgba(255,255,255,0.04)' }}
                                >
                                    {s.badge}
                                </span>
                            )}
                        </div>
                        <div className="text-2xl font-black leading-none" style={{ color: s.valueColor }}>{s.value}</div>
                        {/* Progress bar */}
                        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${s.pct}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: s.bar }}
                            />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500">{s.pct}% of total</span>
                    </div>
                ))}
            </div>

            {/* Honeycomb Grid */}
            <div
                className="relative w-full overflow-hidden rounded-3xl flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #112e52 0%, #0e213b 55%, #12315c 100%)',
                    boxShadow: 'inset 0 0 80px rgba(34,120,176,0.15)',
                    border: '1px solid rgba(34,120,176,0.30)',
                }}
            >
                {/* Brand-blue dot grid */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        opacity: 0.12,
                        backgroundImage: 'radial-gradient(circle, #2278B0 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }}
                />
                {/* Centre glow orb */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(34,120,176,0.14) 0%, transparent 70%)' }}
                />

                {/* Centered responsive container, no scrolling needed since we scale down */}
                <div className="flex flex-col items-center justify-center relative z-10 w-full px-2 py-10 sm:py-14">
                    {chunks.map((row, rIdx) => (
                        <div
                            key={`row-${rIdx}`}
                            className={`flex justify-center ${rIdx > 0 ? '-mt-[18px] sm:-mt-[24px]' : 'mt-0'}`}
                            style={{ zIndex: chunks.length - rIdx }}
                        >
                            {row.map((item, iIdx) => (
                                <Hexagon
                                    key={item.subject}
                                    subject={item.subject}
                                    score={item.score}
                                    delay={(rIdx * 3 + iIdx) * 0.1}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── Hexagon Cell ──────────────────────────────────────────────────────────────
const Hexagon = ({ subject, score, delay }) => {
    let borderColor, glowColor, baseDark;

    if (score >= 80) {
        // Green — Mastered
        borderColor = 'rgba(16,185,129,0.50)';
        glowColor   = 'rgba(16,185,129,0.85)';
        baseDark    = '#052e16';
    } else if (score >= 50) {
        // Yellow / Amber — Learning
        borderColor = 'rgba(245,158,11,0.50)';
        glowColor   = 'rgba(245,158,11,0.85)';
        baseDark    = '#451a03';
    } else {
        // Red — Weak
        borderColor = 'rgba(239,68,68,0.50)';
        glowColor   = 'rgba(239,68,68,0.85)';
        baseDark    = '#450a0a';
    }

    const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
            whileHover={{ scale: 1.1, zIndex: 50 }}
            className="group relative cursor-pointer w-[76px] h-[86px] sm:w-[100px] sm:h-[114px] mx-0.5 sm:mx-1"
        >
            {/* Coloured border shell */}
            <div
                className="absolute inset-0 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-transform duration-300"
                style={{ clipPath: hexClip, backgroundColor: borderColor }}
            >
                {/* Dark inner hex */}
                <div
                    className="absolute top-[2px] left-[2px] right-[2px] bottom-[2px]"
                    style={{ clipPath: hexClip, backgroundColor: '#0f1f38' }}
                >
                    {/* Base tint */}
                    <div className="absolute inset-0" style={{ backgroundColor: baseDark, opacity: 0.35 }} />

                    {/* Animated liquid fill */}
                    <motion.div
                        initial={{ height: '0%' }}
                        animate={{ height: `${score}%` }}
                        transition={{ delay: delay + 0.3, duration: 1.5, ease: 'easeOut' }}
                        className="absolute bottom-0 left-0 right-0"
                        style={{ backgroundColor: glowColor, boxShadow: `0 -6px 18px ${glowColor}` }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-20 mix-blend-overlay pointer-events-none" />
                    </motion.div>

                    {/* Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1 sm:p-2 text-center z-10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                        <span className="text-[17px] sm:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            {score}%
                        </span>
                        <span className="text-[6.5px] sm:text-[9px] uppercase font-bold mt-0.5 text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-[1.1] sm:leading-tight max-w-[90%] break-words">
                            {subject}
                        </span>
                    </div>
                </div>
            </div>

            {/* Hover glow ring */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-screen pointer-events-none"
                style={{ clipPath: hexClip, boxShadow: `inset 0 0 24px ${glowColor}` }}
            />
        </motion.div>
    );
};

export default React.memo(KnowledgeGraph);
