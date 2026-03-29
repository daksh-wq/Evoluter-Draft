import React from 'react';
import { BarChart3, BookOpen } from 'lucide-react';

const ENLISTED_SUBJECTS = [
    'Polity & Constitution',
    'Indian Economy',
    'Geography',
    'Environment',
    'Art & Culture',
    'Ancient History',
    'Medieval History',
    'Modern History',
    'Science & Technology',
    'International Relations'
];

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
        'ancient history': 'Ancient History',
        'medieval history': 'Medieval History',
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
                                {tableData.map((row) => (
                                    <tr key={row.subject} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800 align-top">
                                            {row.subject}
                                        </td>
                                        <td className="px-6 py-4 align-top border-l border-slate-100 bg-green-50/10">
                                            <div className="flex flex-wrap gap-2">
                                                {row.strongSub.length > 0 ? row.strongSub.map((sub, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-green-100 text-green-700 border-green-200 shadow-sm">
                                                        {sub}
                                                    </span>
                                                )) : <span className="text-slate-300 text-xs italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top border-l border-slate-100 bg-yellow-50/10">
                                            <div className="flex flex-wrap gap-2">
                                                {row.manageSub.length > 0 ? row.manageSub.map((sub, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-yellow-100 text-yellow-700 border-yellow-200 shadow-sm">
                                                        {sub}
                                                    </span>
                                                )) : <span className="text-slate-300 text-xs italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top border-l border-slate-100 bg-red-50/10">
                                            <div className="flex flex-wrap gap-2">
                                                {row.critSub.length > 0 ? row.critSub.map((sub, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-red-100 text-red-700 border-red-200 shadow-sm">
                                                        {sub}
                                                    </span>
                                                )) : <span className="text-slate-300 text-xs italic">-</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PerformanceReportView;
