import React, { useState } from 'react';
import { Target, TrendingUp, AlertTriangle, BookOpen, Layers, BarChart3, CheckCircle, PieChart, Activity, HelpCircle } from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

// Reusable Circular Progress Component
const CircularProgress = ({ percentage, colorClass, size = 'w-24 h-24', radius = 36, cx = 48, cy = 48, strokeWidth = 8, textClass = 'text-xl' }) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
        <div className="relative inline-flex items-center justify-center">
            <svg className={`${size} transform -rotate-90 drop-shadow-sm`}>
                <circle className="text-slate-100" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx={cx} cy={cy} />
                <circle 
                    className={`${colorClass} transition-all duration-1000 ease-out`} 
                    strokeWidth={strokeWidth} 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r={radius} cx={cx} cy={cy} 
                />
            </svg>
            <span className={`absolute font-black text-slate-700 ${textClass}`}>{percentage}%</span>
        </div>
    );
};

const PerformanceReportView = ({ userStats }) => {
    // Read from userStats or default to empty
    const perfData = userStats?.performance || null;

    // 1. E-M-D Analysis Data
    const emdData = [
        { level: 'Easy', color: 'text-green-500', barTag: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle size={20} />, ...(perfData?.emd?.Easy || { total: 0, attempted: 0, correct: 0 }) },
        { level: 'Medium', color: 'text-yellow-500', barTag: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: <Activity size={20} />, ...(perfData?.emd?.Medium || { total: 0, attempted: 0, correct: 0 }) },
        { level: 'Difficult', color: 'text-red-500', barTag: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', icon: <AlertTriangle size={20} />, ...(perfData?.emd?.Difficult || { total: 0, attempted: 0, correct: 0 }) },
    ];

    // 2. Subject-wise Proficiency Data
    // Filter out the catch-all "General" group that accumulates full-length test data
    const rawSubjects = perfData?.subjects
        ? Object.entries(perfData.subjects)
            .filter(([k]) => k.toLowerCase() !== 'general')
            .map(([k, v]) => ({ subject: k, ...v }))
        : [];

    const subjectData = rawSubjects.length > 0 ? rawSubjects.map(s => {
        const accuracy = s.attempted > 0 ? Math.round((s.correct * 100) / s.attempted) : 0;
        let status = 'Critical';
        let badgeColor = 'bg-red-100 text-red-700 border-red-200';
        if (accuracy >= 70) { status = 'Strong'; badgeColor = 'bg-green-100 text-green-700 border-green-200'; }
        else if (accuracy >= 40) { status = 'Manageable'; badgeColor = 'bg-yellow-100 text-yellow-700 border-yellow-200'; }
        
        // Parse Subtopics
        const strongSub = [];
        const manageSub = [];
        const critSub = [];
        
        if (s.subtopics) {
            Object.entries(s.subtopics).forEach(([subName, subStats]) => {
                // skip any nested "General" sub-entries
                if (subName.toLowerCase() === 'general') return;
                const subAcc = subStats.attempted > 0 ? Math.round((subStats.correct * 100) / subStats.attempted) : 0;
                if (subAcc >= 70) strongSub.push(subName);
                else if (subAcc >= 40) manageSub.push(subName);
                else critSub.push(subName);
            });
        }

        return { ...s, accuracy, status, badgeColor, strongSub, manageSub, critSub };
    }).sort((a,b) => b.attempted - a.attempted) : [];

    // 3. Resource Proficiency Data
    const resRaw = perfData?.resources || {};
    const resourceData = [
        { source: 'NCERT (Fundamental)', colorClass: 'text-blue-500', bgClass: 'bg-blue-50', barClass: 'bg-blue-500', icon: <BookOpen size={20} />, ...(resRaw['NCERT (Fundamental)'] || { total: 0, attempted: 0, correct: 0 }) },
        { source: 'Standard Books', colorClass: 'text-purple-500', bgClass: 'bg-purple-50', barClass: 'bg-purple-500', icon: <Layers size={20} />, ...(resRaw['Standard Books'] || { total: 0, attempted: 0, correct: 0 }) },
        { source: 'Advanced Sources', colorClass: 'text-orange-500', bgClass: 'bg-orange-50', barClass: 'bg-orange-500', icon: <Target size={20} />, ...(resRaw['Advanced Sources'] || { total: 0, attempted: 0, correct: 0 }) },
    ].map(r => ({ ...r, accuracy: r.attempted > 0 ? Math.round((r.correct * 100) / r.attempted) : 0 }));

    // 4. Question Type Proficiency Data
    const qtRaw = perfData?.questionTypes || {};
    const qTypeData = [
        { type: 'One-liner', ...(qtRaw['One-liner'] || { total: 0, attempted: 0, correct: 0 }) },
        { type: 'Statement (How many)', ...(qtRaw['Statement (How many)'] || { total: 0, attempted: 0, correct: 0 }) },
        { type: 'Statement (Which of)', ...(qtRaw['Statement (Which of)'] || { total: 0, attempted: 0, correct: 0 }) },
        { type: 'Match the pairs', ...(qtRaw['Match the pairs'] || { total: 0, attempted: 0, correct: 0 }) },
        { type: 'Assertion-Reason', ...(qtRaw['Assertion-Reason'] || { total: 0, attempted: 0, correct: 0 }) },
    ].map(q => ({ ...q, accuracy: q.attempted > 0 ? Math.round((q.correct * 100) / q.attempted) : 0 }));

    const [subtopicFilters, setSubtopicFilters] = useState({});
    const getSubtopicFilter = (subjectName) => subtopicFilters[subjectName] || 'All';
    const setSubtopicFilter = (subjectName, val) =>
        setSubtopicFilters(prev => ({ ...prev, [subjectName]: val }));

    const TOPIC_FILTER_OPTIONS = [
        { label: 'All Topics',  value: 'All' },
        { label: 'Strong',      value: 'Strong' },
        { label: 'Manageable',  value: 'Manageable' },
        { label: 'Critical',    value: 'Critical' },
    ];

    return (
        <div className="pt-4 pb-20 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <span className="p-2.5 bg-[#2278B0]/10 text-[#2278B0] rounded-xl">
                            <BarChart3 size={28} />
                        </span>
                        Performance Report
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-2xl">
                        Deep insights into your test performance. Identify your strengths and target weak areas to improve strategically.
                    </p>
                </div>
            </div>

            {/* SECTION 1: E-M-D Analysis */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <PieChart className="text-[#2278B0]" size={22} />
                    Difficulty-wise Performance (E-M-D)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {emdData.map((item) => {
                        const accuracy = item.attempted > 0 ? Math.round((item.correct * 100) / item.attempted) : 0;
                        return (
                            <div key={item.level} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${item.bg} ${item.text} font-bold text-sm border border-slate-100 shadow-sm`}>
                                        {item.icon} {item.level}
                                    </div>
                                    <CircularProgress percentage={accuracy} colorClass={item.color} size="w-16 h-16" radius={24} cx={32} cy={32} strokeWidth={5} textClass="text-sm" />
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                                        <div className="text-xs font-bold text-slate-400 uppercase">Total</div>
                                        <div className="font-black text-slate-700 text-lg">{item.total}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                                        <div className="text-xs font-bold text-slate-400 uppercase">Attempt</div>
                                        <div className="font-black text-slate-700 text-lg">{item.attempted}</div>
                                    </div>
                                    <div className={`rounded-xl p-2 border ${item.bg} border-transparent`}>
                                        <div className={`text-xs font-bold ${item.text} opacity-80 uppercase`}>Correct</div>
                                        <div className={`font-black ${item.text} text-lg`}>{item.correct}</div>
                                    </div>
                                </div>

                                {/* Decorative Background Bar */}
                                <div className={`absolute bottom-0 left-0 h-1.5 ${item.barTag} transition-all duration-1000`} style={{ width: `${accuracy}%` }} />
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* SECTION 2: Subject-wise Proficiency */}
            <section className="space-y-4 pt-6 mt-6 border-t border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="text-[#2278B0]" size={22} />
                    Subject-wise Proficiency
                </h2>

                {subjectData.length > 0 ? (
                    <div className="space-y-4">
                        {subjectData.map((s) => {
                            const activeFilter = getSubtopicFilter(s.subject);
                            const allSubs = [
                                ...s.strongSub.map(n => ({ name: n, cat: 'Strong' })),
                                ...s.manageSub.map(n => ({ name: n, cat: 'Manageable' })),
                                ...s.critSub.map(n => ({ name: n, cat: 'Critical' })),
                            ];
                            const visibleSubs = activeFilter === 'All'
                                ? allSubs
                                : allSubs.filter(sub => sub.cat === activeFilter);

                            const catStyle = {
                                Strong:     { chip: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500' },
                                Manageable: { chip: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
                                Critical:   { chip: 'bg-red-100 text-red-700 border-red-200',   dot: 'bg-red-500' },
                            };

                            return (
                                <div key={s.subject} className="relative bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    {/* Subject header row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <span className="font-black text-slate-800 text-sm">{s.subject}</span>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                                <span>Total: <strong className="text-slate-700">{s.total}</strong></span>
                                                <span className="text-slate-300">|</span>
                                                <span>Attempted: <strong className="text-slate-700">{s.attempted}</strong></span>
                                                <span className="text-slate-300">|</span>
                                                <span>Correct: <strong className="text-slate-700">{s.correct}</strong></span>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${s.badgeColor}`}>
                                                {s.accuracy}%
                                            </span>
                                        </div>
                                        {/* Per-subject filter */}
                                        <CustomDropdown
                                            label="All Topics"
                                            options={TOPIC_FILTER_OPTIONS}
                                            value={activeFilter}
                                            onChange={(val) => setSubtopicFilter(s.subject, val)}
                                            isFilter
                                        />
                                    </div>

                                    {/* Subtopics */}
                                    <div className="px-5 py-4">
                                        {allSubs.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No subtopic data available for this subject yet.</p>
                                        ) : visibleSubs.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No subtopics under "{activeFilter}" for this subject.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {visibleSubs.map((sub, i) => (
                                                    <span
                                                        key={i}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${catStyle[sub.cat].chip}`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${catStyle[sub.cat].dot}`} />
                                                        {sub.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-400 font-medium">
                        No subject data available yet. Take a test to see your proficiency!
                    </div>
                )}
            </section>

            {/* SUB-SECTION ROW: Resource & Question Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-100">
                
                {/* SECTION 3: Resource Proficiency */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Layers className="text-[#2278B0]" size={22} />
                        Resource Proficiency
                    </h2>
                    <div className="space-y-4">
                        {resourceData.map((r) => (
                            <div key={r.source} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="flex justify-between items-center mb-3">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${r.bgClass} ${r.colorClass} font-bold text-sm`}>
                                        {r.icon} {r.source}
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-2xl font-black ${r.colorClass}`}>{r.accuracy}%</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 text-xs font-semibold text-slate-500 mb-3">
                                    <div>Total: <span className="text-slate-700">{r.total}</span></div>
                                    <div>Att: <span className="text-slate-700">{r.attempted}</span></div>
                                    <div>Cor: <span className="text-slate-700">{r.correct}</span></div>
                                </div>

                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div className={`h-2 rounded-full ${r.barClass} transition-all duration-1000`} style={{ width: `${r.accuracy}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* SECTION 4: Question Type Proficiency */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <HelpCircle className="text-[#2278B0]" size={22} />
                        Question Type Proficiency
                    </h2>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2">
                        {qTypeData.map((q) => {
                            let barColor = 'bg-[#2278B0]';
                            let textColor = 'text-[#2278B0]';
                            if (q.accuracy < 40) { barColor = 'bg-red-500'; textColor = 'text-red-600'; }
                            else if (q.accuracy < 70) { barColor = 'bg-yellow-500'; textColor = 'text-yellow-600'; }
                            else { barColor = 'bg-green-500'; textColor = 'text-green-600'; }

                            return (
                                <div key={q.type} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-xl">
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <h4 className="font-bold text-slate-700 text-sm mb-1">{q.type}</h4>
                                            <div className="flex gap-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                                <span>A: <strong className="text-slate-600">{q.attempted}</strong></span>
                                                <span>C: <strong className="text-slate-600">{q.correct}</strong></span>
                                            </div>
                                        </div>
                                        <div className={`font-black text-lg ${textColor}`}>
                                            {q.accuracy}%
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                                        <div className={`h-2 rounded-full ${barColor} transition-all duration-1000`} style={{ width: `${q.accuracy}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

            </div>
        </div>
    );
};

export default PerformanceReportView;
