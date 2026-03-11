import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { RefreshCw, ListChecks, Calendar, Clock, Copy, Timer, CheckCircle } from 'lucide-react';
import logger from '../../utils/logger';

const getTestTimeState = (test) => {
    if (!test.isScheduled || (!test.scheduledStart && !test.scheduledEnd)) return 'live';
    const now = new Date();
    const start = test.scheduledStart?.toDate ? test.scheduledStart.toDate() : null;
    const end = test.scheduledEnd?.toDate ? test.scheduledEnd.toDate() : null;
    if (start && now < start) return 'scheduled';
    if (end && now > end) return 'ended';
    return 'live';
};

const TestManager = ({ userData }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTests = async () => {
            if (!userData?.uid) return;
            try {
                const q = query(
                    collection(db, 'institution_tests'),
                    where('creatorId', '==', userData.uid),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                const fetchedTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTests(fetchedTests);
            } catch (error) {
                logger.error("Error fetching institution tests", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTests();
    }, [userData]);

    if (loading) return <div className="p-10 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>;

    return (
        <div className="pb-20">
            <h1 className="text-3xl font-black text-slate-900 mb-8">Test Management</h1>

            {tests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                    <p className="text-slate-500">No tests found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map(test => {
                        const timeState = getTestTimeState(test);
                        const startDate = test.scheduledStart?.toDate ? test.scheduledStart.toDate() : null;
                        const endDate = test.scheduledEnd?.toDate ? test.scheduledEnd.toDate() : null;

                        return (
                            <div key={test.id} className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${timeState === 'ended' ? 'border-red-100' : timeState === 'scheduled' ? 'border-amber-100' : 'border-slate-100'
                                }`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                                            {test.subject}
                                        </span>
                                        {/* Time State Badge */}
                                        {timeState === 'live' && (
                                            <span className="text-[10px] bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> LIVE
                                            </span>
                                        )}
                                        {timeState === 'scheduled' && (
                                            <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                <Timer size={10} /> SCHEDULED
                                            </span>
                                        )}
                                        {timeState === 'ended' && (
                                            <span className="text-[10px] bg-red-100 text-red-600 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                <CheckCircle size={10} /> ENDED
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-400 text-xs font-bold cursor-pointer hover:text-[#2278B0]"
                                        onClick={() => navigator.clipboard.writeText(test.testCode)}
                                    >
                                        <Copy size={12} /> {test.testCode}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2">{test.title}</h3>

                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
                                    <span className="flex items-center gap-1"><Clock size={14} /> {test.duration}m</span>
                                    <span className="flex items-center gap-1"><ListChecks size={14} /> {test.questions?.length} Qs</span>
                                </div>

                                {/* Schedule Info */}
                                {test.isScheduled && startDate && endDate && (
                                    <div className="text-xs text-slate-400 mt-3 flex items-center gap-1 bg-slate-50 p-2 rounded-lg">
                                        <Calendar size={11} />
                                        {startDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        {' → '}
                                        {endDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TestManager;
