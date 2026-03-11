import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMasteryColor } from '../../utils/helpers';
import { Brain, Sparkles, BookOpen, AlertCircle, Trophy, TrendingUp, X } from 'lucide-react';

/**
 * KnowledgeGraph Component
 * Clean, professional mastery visualization — properly centered constellation layout.
 */
const KnowledgeGraph = ({ mastery = {} }) => {
    const [selectedNode, setSelectedNode] = useState(null);

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

    // Transform mastery into positioned nodes
    const nodes = useMemo(() => {
        const topics = Object.entries(mastery);
        if (topics.length === 0) return [];

        const sorted = topics.sort(([, a], [, b]) => b - a);
        const count = sorted.length;

        return sorted.map(([topic, score], index) => {
            const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
            const baseRadius = count <= 4 ? 28 : count <= 8 ? 30 : count <= 12 ? 32 : 34;
            const radius = baseRadius + (index % 2 === 0 ? 0 : 6);
            // Use percentage-based positions relative to center (50%, 50%)
            const cx = 50 + Math.cos(angle) * radius;
            const cy = 50 + Math.sin(angle) * radius;
            return {
                id: topic,
                label: topic,
                score,
                cx, // percentage from left
                cy, // percentage from top
                color: getMasteryColor(score),
            };
        });
    }, [mastery]);

    const getStatusLabel = (score) => {
        if (score >= 80) return { text: 'Mastered', icon: Trophy };
        if (score >= 50) return { text: 'Learning', icon: BookOpen };
        return { text: 'Needs Work', icon: AlertCircle };
    };

    if (nodes.length === 0) {
        return (
            <div className="h-64 w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 border border-slate-200/60">
                <div className="w-14 h-14 bg-slate-200/60 rounded-2xl flex items-center justify-center mb-3">
                    <Brain size={24} className="text-slate-400" />
                </div>
                <p className="font-semibold text-slate-500 text-sm">No knowledge data yet</p>
                <p className="text-xs mt-1 text-slate-400">Take a test to generate your mastery graph</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: 'Topics', value: stats.total, color: 'text-slate-700' },
                    { label: 'Avg Mastery', value: `${stats.avg}%`, color: 'text-[#2278B0]' },
                    { label: 'Strong', value: stats.strong, color: 'text-emerald-600' },
                    { label: 'Weak', value: stats.weak, color: 'text-amber-600' },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl p-2.5 border border-slate-100 text-center">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{s.label}</div>
                        <div className={`text-lg font-bold ${s.color} mt-0.5`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Graph */}
            <div className="relative w-full aspect-square max-h-[420px] bg-gradient-to-br from-[#0c1222] via-[#111827] to-[#0f172a] rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg">
                {/* Dot grid */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}
                />

                {/* Center glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-[#2278B0]/5 blur-3xl pointer-events-none" />

                {/* Connection Lines — SVG covers the full container */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    {nodes.map((node, i) => (
                        <motion.line
                            key={`line-${node.id}`}
                            x1="50" y1="50"
                            x2={node.cx} y2={node.cy}
                            stroke={selectedNode?.id === node.id ? node.color : '#334155'}
                            strokeWidth={selectedNode?.id === node.id ? '0.4' : '0.2'}
                            strokeDasharray={selectedNode?.id === node.id ? 'none' : '0.8 0.8'}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: selectedNode?.id === node.id ? 0.7 : 0.25 }}
                            transition={{ duration: 0.6, delay: i * 0.04 }}
                        />
                    ))}
                </svg>

                {/* Center Node */}
                <motion.div
                    className="absolute z-20"
                    style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                    <div className="w-12 h-12 rounded-full bg-[#111827] border-2 border-[#2278B0]/50 flex items-center justify-center shadow-[0_0_16px_rgba(34,120,176,0.12)]">
                        <TrendingUp size={20} className="text-[#2278B0]" />
                    </div>
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">You</span>
                    </div>
                </motion.div>

                {/* Topic Nodes — positioned by percentage */}
                {nodes.map((node, index) => {
                    const status = getStatusLabel(node.score);
                    const StatusIcon = status.icon;
                    const isSelected = selectedNode?.id === node.id;

                    return (
                        <motion.div
                            key={node.id}
                            className="absolute z-20 cursor-pointer"
                            style={{
                                left: `${node.cx}%`,
                                top: `${node.cy}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 20 }}
                            onClick={() => setSelectedNode(isSelected ? null : node)}
                            whileHover={{ scale: 1.15 }}
                        >
                            {/* Node circle */}
                            <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isSelected ? 'ring-2 ring-offset-2 ring-offset-[#111827]' : ''}`}
                                style={{
                                    backgroundColor: `${node.color}15`,
                                    border: `1.5px solid ${node.color}${isSelected ? 'bb' : '44'}`,
                                    boxShadow: isSelected ? `0 0 16px ${node.color}25` : 'none',
                                    '--tw-ring-color': node.color,
                                }}
                            >
                                <StatusIcon size={14} style={{ color: node.color }} />
                            </div>

                            {/* Label */}
                            <div className="absolute top-11 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                                <span className="text-[8px] font-medium text-slate-400 bg-[#111827]/90 px-1.5 py-0.5 rounded whitespace-nowrap max-w-[90px] truncate leading-tight">
                                    {node.label}
                                </span>
                                <span className="text-[9px] font-bold mt-0.5" style={{ color: node.color }}>
                                    {Math.round(node.score)}%
                                </span>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Detail Panel */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-3 left-3 right-3 bg-[#0f172a]/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 z-30 shadow-2xl"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-white text-sm leading-tight">{selectedNode.label}</h3>
                                    <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: selectedNode.color }}>
                                        {getStatusLabel(selectedNode.score).text}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedNode(null); }}
                                    className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mt-3">
                                <span className="text-2xl font-black" style={{ color: selectedNode.color }}>
                                    {Math.round(selectedNode.score)}%
                                </span>
                                <div className="flex-1">
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${selectedNode.score}%` }}
                                            transition={{ duration: 0.5 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: selectedNode.color }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
                                {selectedNode.score < 50
                                    ? "Needs focused attention. Consider targeted practice sessions."
                                    : selectedNode.score < 80
                                        ? "Good progress — consistent revision will solidify this."
                                        : "Strong mastery. Periodic reviews will maintain your edge."}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default React.memo(KnowledgeGraph);
