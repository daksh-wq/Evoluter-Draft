 import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks';
import { BarChart3, BookOpen, Activity, Brain, Target, Database, ChevronDown, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SUBJECTS } from '../../constants/appConstants';

const ENLISTED_SUBJECTS = SUBJECTS.filter(s => s !== 'All Subjects');

// Strip any "Subject > " prefix — only show the leaf subtopic name in badges.
const subtopicLabel = (sub) => sub.includes(' > ') ? sub.split(' > ').at(-1).trim() : sub;

const PerformanceReportView = ({ userStats }) => {
    const perfData = userStats?.performance || null;

    const canonicalMappings = {
        'indian polity': 'Polity & Constitution',
        'polity': 'Polity & Constitution',
        'polity & constitution': 'Polity & Constitution',
        'indian economy': 'Indian Economy',
        'economy': 'Indian Economy',
        'economy of india': 'Indian Economy',
        'geography': 'Geography',
        'indian geography': 'Geography',
        'world geography': 'Geography',
        'physical geography': 'Geography',
        'environment': 'Environment',
        'environment & ecology': 'Environment',
        'ecology and environment': 'Environment',
        'art & culture': 'Art & Culture',
        'art and culture': 'Art & Culture',
        'indian culture': 'Art & Culture',
        'culture': 'Art & Culture',
        'ancient history': 'Ancient & Medieval History',
        'medieval history': 'Ancient & Medieval History',
        'ancient & medieval history': 'Ancient & Medieval History',
        'modern indian history': 'Modern History',
        'modern india': 'Modern History',
        'modern history': 'Modern History',
        'science & technology': 'Science & Technology',
        'science and technology': 'Science & Technology',
        'science': 'Science & Technology',
        'general science': 'Science & Technology',
        'international relations': 'International Relations',
        'ir': 'International Relations'
    };

    const processedSubjects = {};
    
    // Initialize enlisted subjects to maintain strict order
    ENLISTED_SUBJECTS.forEach(sub => {
        processedSubjects[sub] = { subtopics: {} };
    });

    if (perfData?.subjects) {
        Object.entries(perfData.subjects).forEach(([k, v]) => {
            if (k.toLowerCase() === 'general') return;
            
            let subjectKey = canonicalMappings[k.toLowerCase()] || k;
            
            // Only enlisted subjects are included in the new report logic
            if (!ENLISTED_SUBJECTS.includes(subjectKey)) return;

            if (v.subtopics) {
                Object.entries(v.subtopics).forEach(([subName, subStats]) => {
                    if (subName.toLowerCase() === 'general') return;
                    if (!processedSubjects[subjectKey].subtopics[subName]) {
                        processedSubjects[subjectKey].subtopics[subName] = { total: 0, attempted: 0, correct: 0 };
                    }
                    processedSubjects[subjectKey].subtopics[subName].total += subStats.total || 0;
                    processedSubjects[subjectKey].subtopics[subName].attempted += subStats.attempted || 0;
                    processedSubjects[subjectKey].subtopics[subName].correct += subStats.correct || 0;
                });
            }
        });
    }

    const tableData = ENLISTED_SUBJECTS.map(subject => {
        const sData = processedSubjects[subject];
        const strongSub = [];
        const manageSub = [];
        const critSub = [];

        if (sData.subtopics) {
            Object.entries(sData.subtopics).forEach(([subName, subStats]) => {
                const total = subStats.total || 0;
                const attempted = subStats.attempted || 0;
                const correct = subStats.correct || 0;
                
                if (total > 0) {
                    const incorrect = attempted - correct;
                    const netMarks = (correct * 2) - (incorrect * 0.66);
                    const totalMaxMarks = total * 2;
                    
                    const percentage = (netMarks / totalMaxMarks) * 100;
                    
                    if (percentage >= 60) strongSub.push(subName);
                    else if (percentage >= 40) manageSub.push(subName);
                    else critSub.push(subName);
                }
            });
        }
        
        return { subject, strongSub, manageSub, critSub };
    });

    const emdData = perfData?.emd || {};
    const resourceData = perfData?.resources || {};
    const qTypeData = perfData?.questionTypes || {};
    const StatCard = ({ title, data, icon, color }) => {
        const total = data?.total || 0;
        const correct = data?.correct || 0;
        const attempt = data?.attempted || 0;
        const accuracy = attempt > 0 ? Math.round((correct / attempt) * 100) : 0;
        
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-xl ${color}`}>
                        {icon}
                    </div>
                    <h3 className="font-bold text-slate-800">{title}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <p className="text-xl font-black text-slate-800">{total}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</p>
                    </div>
                    <div className="bg-[#2278B0]/5 p-2 rounded-lg border border-[#2278B0]/10">
                        <p className="text-xl font-black text-[#2278B0]">{attempt}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Attempt</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                        <p className="text-xl font-black text-green-600">{accuracy}%</p>
                        <p className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest mt-1">Accuracy</p>
                    </div>
                </div>
            </div>
        );
    };

    const QuestionTypeRow = ({ title, data, icon, colorStr, bgStr }) => {
        const total = data?.total || 0;
        const attempt = data?.attempted || 0;
        const correct = data?.correct || 0;
        const accuracy = attempt > 0 ? Math.round((correct / attempt) * 100) : 0;
        const attemptPct = total > 0 ? Math.round((attempt / total) * 100) : 0;

        return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 min-w-[220px]">
                    <div className={`p-3 rounded-xl ${bgStr} ${colorStr}`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{total} total generated</p>
                    </div>
                </div>
                
                <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-4 sm:gap-6 px-0 sm:px-4">
                    <div className="flex-1 w-full">
                        <div className="flex justify-between text-xs font-bold mb-2">
                            <span className="text-slate-500">Attempted</span>
                            <span className="text-[#2278B0]">{attempt} / {total}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#2278B0] rounded-full transition-all duration-1000" style={{ width: `${attemptPct}%` }} />
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full">
                        <div className="flex justify-between text-xs font-bold mb-2">
                            <span className="text-slate-500">Accuracy</span>
                            <span className={accuracy >= 70 ? 'text-green-600' : accuracy >= 40 ? 'text-yellow-600' : 'text-red-500'}>{accuracy}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                               className={`h-full rounded-full transition-all duration-1000 ${accuracy >= 70 ? 'bg-green-500' : accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                               style={{ width: `${accuracy}%` }} 
                            />
                        </div>
                    </div>
                </div>
                
                <div className="hidden lg:flex items-center justify-center min-w-[80px]">
                    <div className={`text-center px-4 py-2 rounded-lg border w-full ${accuracy >= 70 ? 'bg-green-50 border-green-100' : accuracy >= 40 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}>
                        <p className={`text-xl font-black ${accuracy >= 70 ? 'text-green-600' : accuracy >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{accuracy}%</p>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">Score</p>
                    </div>
                </div>
            </div>
        );
    };

    const formatDateRobust = (timestamp) => {
        if (!timestamp) return null;
        try {
            let date;
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else if (timestamp.seconds !== undefined) {
                date = new Date(timestamp.seconds * 1000);
            } else if (timestamp._seconds !== undefined) {
                date = new Date(timestamp._seconds * 1000);
            } else {
                date = new Date(timestamp);
                if (isNaN(date.getTime()) && !isNaN(Number(timestamp))) {
                    date = new Date(Number(timestamp));
                }
            }
            if (isNaN(date.getTime())) return null;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return null;
        }
    };

    const [expandedSubject, setExpandedSubject] = useState(null);

    // Build per-subject chart data with dynamic question-number X-axis (max 10 ticks)
    const buildSubjectChartData = (subject) => {
        const sData = processedSubjects[subject];
        if (!sData?.subtopics) return [];

        const subtopics = Object.entries(sData.subtopics)
            .filter(([, s]) => (s.total || 0) > 0)
            .sort((a, b) => a[0].localeCompare(b[0]));

        const totalQuestions = subtopics.reduce((sum, [, s]) => sum + (s.total || 0), 0);
        if (totalQuestions === 0) return [];

        // Dynamic step: aim for max 10 ticks
        const step = Math.ceil(totalQuestions / 10);

        // Walk through subtopics in order, linearly interpolate at each tick boundary
        const data = [{ label: 0, attempt: 0, correct: 0 }];
        let cumQ = 0;          // questions counted so far
        let cumAttempt = 0;    // cumulative attempted so far (before current block)
        let cumCorrect = 0;    // cumulative correct so far (before current block)
        let tickNum = 1;

        for (const [, stats] of subtopics) {
            const blockTotal    = stats.total    || 0;
            const blockAttempt  = stats.attempted || 0;
            const blockCorrect  = stats.correct   || 0;
            const prevCumQ = cumQ;
            cumQ += blockTotal;

            // Emit all ticks that fall inside this block
            while (tickNum * step <= cumQ && tickNum * step <= totalQuestions) {
                const tickQ = tickNum * step;
                const frac = blockTotal > 0 ? (tickQ - prevCumQ) / blockTotal : 1;
                const interpAttempt = cumAttempt + Math.round(blockAttempt * frac);
                const interpCorrect = cumCorrect  + Math.round(blockCorrect * frac);
                data.push({ label: tickQ, attempt: interpAttempt, correct: interpCorrect });
                tickNum++;
            }

            cumAttempt += blockAttempt;
            cumCorrect  += blockCorrect;
        }

        // Always cap with the true final point
        if (data[data.length - 1]?.label !== totalQuestions) {
            data.push({ label: totalQuestions, attempt: cumAttempt, correct: cumCorrect });
        }

        return data;
    };

    const { user } = useAuth();
    const [allTests, setAllTests] = useState([]);

    useEffect(() => {
        if (!user?.uid) return;
        const fetchAllTests = async () => {
            try {
                const testsRef = collection(db, `users/${user.uid}/tests`);
                const q = query(testsRef, orderBy('completedAt', 'desc'));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setAllTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
            } catch (error) {
                console.error('Failed to fetch tests:', error);
            }
        };
        fetchAllTests();
    }, [user?.uid]);

    // Overall chart: combine ALL subjects using same tick logic as accordion charts
    const overallChartData = useMemo(() => {
        // Flatten all subtopics from all subjects into one ordered sequence
        const allSubtopics = [];
        ENLISTED_SUBJECTS.forEach(subject => {
            const sData = processedSubjects[subject];
            if (!sData?.subtopics) return;
            Object.entries(sData.subtopics)
                .filter(([, s]) => (s.total || 0) > 0)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .forEach(([, stats]) => allSubtopics.push(stats));
        });

        const totalQ = allSubtopics.reduce((sum, s) => sum + (s.total || 0), 0);
        if (totalQ === 0) return [];

        const step = Math.ceil(totalQ / 10);
        const data = [{ label: 0, attempt: 0, correct: 0 }];
        let cumQ = 0, cumAttempt = 0, cumCorrect = 0, tickNum = 1;

        for (const stats of allSubtopics) {
            const blockTotal   = stats.total    || 0;
            const blockAttempt = stats.attempted || 0;
            const blockCorrect = stats.correct   || 0;
            const prevCumQ = cumQ;
            cumQ += blockTotal;

            while (tickNum * step <= cumQ && tickNum * step <= totalQ) {
                const tickQ = tickNum * step;
                const frac = blockTotal > 0 ? (tickQ - prevCumQ) / blockTotal : 1;
                data.push({
                    label: tickQ,
                    attempt: cumAttempt + Math.round(blockAttempt * frac),
                    correct:  cumCorrect  + Math.round(blockCorrect  * frac)
                });
                tickNum++;
            }
            cumAttempt += blockAttempt;
            cumCorrect  += blockCorrect;
        }

        if (data[data.length - 1]?.label !== totalQ) {
            data.push({ label: totalQ, attempt: cumAttempt, correct: cumCorrect });
        }
        return data;
    }, [processedSubjects]);

    return (
        <div className="pt-4 pb-20 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6">
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

            {/* Overall EMD & Resources Performance */}
            <section className="space-y-8 pt-4 pb-2">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Brain className="text-[#2278B0]" size={22} />
                        Difficulty Analysis (EMD)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="Easy" data={emdData['Easy']} icon={<Target size={20} />} color="bg-green-50 text-green-600" />
                        <StatCard title="Medium" data={emdData['Medium']} icon={<Activity size={20} />} color="bg-orange-50 text-orange-600" />
                        <StatCard title="Difficult" data={emdData['Difficult']} icon={<TrendingUp size={20} />} color="bg-red-50 text-red-600" />
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Database className="text-[#2278B0]" size={22} />
                        Resource Proficiency
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="NCERT (Fundamental)" data={resourceData['NCERT (Fundamental)']} icon={<BookOpen size={20} />} color="bg-blue-50 text-blue-600" />
                        <StatCard title="Standard Books" data={resourceData['Standard Books']} icon={<BookOpen size={20} />} color="bg-indigo-50 text-indigo-600" />
                        <StatCard title="Advanced Sources" data={resourceData['Advanced Sources']} icon={<Database size={20} />} color="bg-purple-50 text-purple-600" />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Target className="text-[#2278B0]" size={22} />
                            Question Type Performance
                        </h2>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-3 md:space-y-4">
                        <QuestionTypeRow title="One-Liner" data={qTypeData['One-liner']} icon={<BookOpen size={20} />} bgStr="bg-cyan-50" colorStr="text-cyan-600" />
                        <QuestionTypeRow title="Statement (How Many)" data={qTypeData['Statement (How many)']} icon={<Target size={20} />} bgStr="bg-teal-50" colorStr="text-teal-600" />
                        <QuestionTypeRow title="Statement (Which Of)" data={qTypeData['Statement (Which of)']} icon={<Target size={20} />} bgStr="bg-emerald-50" colorStr="text-emerald-600" />
                        <QuestionTypeRow title="Assertion-Reason" data={qTypeData['Assertion-Reason']} icon={<Brain size={20} />} bgStr="bg-violet-50" colorStr="text-violet-600" />
                        <QuestionTypeRow title="Match the Pairs" data={qTypeData['Match the pairs']} icon={<Database size={20} />} bgStr="bg-fuchsia-50" colorStr="text-fuchsia-600" />
                    </div>
                </div>
            </section>

            {/* Subject-wise Proficiency Table - Now shown second */}
            <section className="space-y-4 pt-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <BookOpen className="text-[#2278B0]" size={22} />
                    Subject-wise Proficiency
                </h2>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap lg:whitespace-normal">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-700 w-1/4">Subject</th>
                                    <th className="px-6 py-4 font-bold text-green-700 bg-green-50/50 w-1/4 border-l border-slate-200">Strong - Green</th>
                                    <th className="px-6 py-4 font-bold text-yellow-700 bg-yellow-50/50 w-1/4 border-l border-slate-200">Manageable - Yellow</th>
                                    <th className="px-6 py-4 font-bold text-red-700 bg-red-50/50 w-1/4 border-l border-slate-200">Critical - Red</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableData.map((row) => {
                                    const isExpanded = expandedSubject === row.subject;
                                    const subjectChartData = isExpanded ? buildSubjectChartData(row.subject) : [];
                                    return (
                                        <React.Fragment key={row.subject}>
                                            {/* Clickable subject header row */}
                                            <tr
                                                onClick={() => setExpandedSubject(isExpanded ? null : row.subject)}
                                                className="hover:bg-slate-50 transition-colors cursor-pointer select-none"
                                            >
                                                <td className="px-6 py-4 font-bold text-slate-800 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <ChevronDown
                                                            size={16}
                                                            className={`text-slate-400 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                        {row.subject}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top border-l border-slate-100 bg-green-50/10">
                                                    <div className="flex flex-wrap gap-2">
                                                        {row.strongSub.length > 0 ? row.strongSub.map((sub, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-green-100 text-green-700 border-green-200 shadow-sm">
                                                                {subtopicLabel(sub)}
                                                            </span>
                                                        )) : <span className="text-slate-300 text-xs italic">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top border-l border-slate-100 bg-yellow-50/10">
                                                    <div className="flex flex-wrap gap-2">
                                                        {row.manageSub.length > 0 ? row.manageSub.map((sub, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-yellow-100 text-yellow-700 border-yellow-200 shadow-sm">
                                                                {subtopicLabel(sub)}
                                                            </span>
                                                        )) : <span className="text-slate-300 text-xs italic">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top border-l border-slate-100 bg-red-50/10">
                                                    <div className="flex flex-wrap gap-2">
                                                        {row.critSub.length > 0 ? row.critSub.map((sub, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-red-100 text-red-700 border-red-200 shadow-sm">
                                                                {subtopicLabel(sub)}
                                                            </span>
                                                        )) : <span className="text-slate-300 text-xs italic">-</span>}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Collapsible chart row */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={4} className="px-0 py-0 border-t border-[#2278B0]/20 bg-gradient-to-br from-[#2278B0]/5 to-slate-50">
                                                        <div className="px-6 py-5">
                                                            <p className="text-xs font-bold text-[#2278B0] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                                <Activity size={13} /> Subtopic Progress — {row.subject}
                                                            </p>
                                                            {subjectChartData.length > 1 ? (
                                                                <ResponsiveContainer width="100%" height={220}>
                                                                    <LineChart data={subjectChartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                                        <XAxis
                                                                            dataKey="label"
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                                                            label={{ value: 'Total Questions', position: 'insideBottom', offset: -14, fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                                                                            allowDecimals={false}
                                                                        />
                                                                        <YAxis
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                                                            allowDecimals={false}
                                                                            label={{ value: 'No. of MCQs', angle: -90, position: 'insideLeft', offset: 14, fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                                                                        />
                                                                        <Tooltip
                                                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.12)', fontSize: 12 }}
                                                                            labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: 4 }}
                                                                            labelFormatter={(v) => `Q ${v}`}
                                                                        />
                                                                        <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                                                                        <Line
                                                                            type="monotone"
                                                                            dataKey="attempt"
                                                                            name="Attempted"
                                                                            stroke="#3b82f6"
                                                                            strokeWidth={2.5}
                                                                            dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                                                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                                                        />
                                                                        <Line
                                                                            type="monotone"
                                                                            dataKey="correct"
                                                                            name="Correct"
                                                                            stroke="#10b981"
                                                                            strokeWidth={2.5}
                                                                            dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                                                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                                                        />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            ) : (
                                                                /* Empty chart state — axes shown, no data lines */
                                                                <ResponsiveContainer width="100%" height={220}>
                                                                    <LineChart data={[{ label: 0, attempt: null, correct: null }]} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} label={{ value: 'Total Questions', position: 'insideBottom', offset: -14, fill: '#cbd5e1', fontSize: 11 }} />
                                                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} label={{ value: 'No. of MCQs', angle: -90, position: 'insideLeft', offset: 14, fill: '#cbd5e1', fontSize: 11 }} />
                                                                        <text x="50%" y="45%" textAnchor="middle" fill="#94a3b8" fontSize={13} fontWeight="600">No data yet — attempt questions in this subject</text>
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Overall Performance Graph — all subjects combined */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="text-[#2278B0]" size={22} />
                        Overall Performance Graph
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">Cumulative attempt &amp; correct across all subjects and subtopics.</p>
                </div>

                <div className="h-[300px] w-full">
                    {overallChartData.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={overallChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    allowDecimals={false}
                                    label={{ value: 'Total Questions', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                                    labelFormatter={(v) => `Q ${v}`}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="attempt"
                                    name="Attempted"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="correct"
                                    name="Correct"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                            <Activity size={32} className="mb-2 text-slate-300" />
                            <p className="text-sm font-bold">No performance data yet.</p>
                            <p className="text-xs mt-1">Attempt tests across subjects to see your cumulative graph.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default PerformanceReportView;
