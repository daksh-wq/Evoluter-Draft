import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
    RefreshCw, ListChecks, Calendar, Clock, Copy, Timer,
    CheckCircle, BarChart2, Users, Lock, Globe, ChevronRight,
    Check, ClipboardList, TrendingUp, AlertCircle
} from 'lucide-react';
import logger from '../../utils/logger';
import { useNavigate } from 'react-router-dom';

const getTestTimeState = (test) => {
    if (!test.isScheduled || (!test.scheduledStart && !test.scheduledEnd)) return 'live';
    const now = new Date();
    const start = test.scheduledStart?.toDate ? test.scheduledStart.toDate() : null;
    const end = test.scheduledEnd?.toDate ? test.scheduledEnd.toDate() : null;
    if (start && now < start) return 'scheduled';
    if (end && now > end) return 'ended';
    return 'live';
};

const CopyButton = ({ value, label }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            onClick={handleCopy}
            title={`Copy ${label}`}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all duration-200 border ${
                copied
                    ? 'bg-green-50 text-green-600 border-green-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
            }`}
        >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {value}
            {copied && <span className="text-[10px]">Copied!</span>}
        </button>
    );
};

const StatPill = ({ icon, value, label, color = 'slate' }) => {
    const colorMap = {
        slate: 'bg-slate-50 text-slate-600',
        green: 'bg-green-50 text-green-700',
        blue: 'bg-blue-50 text-blue-700',
        amber: 'bg-amber-50 text-amber-700',
    };
    return (
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg ${colorMap[color]}`}>
            {icon}
            <span>{value}</span>
            {label && <span className="text-[10px] opacity-70 font-medium">{label}</span>}
        </div>
    );
};

const TestManager = ({ userData }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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

    if (loading) return (
        <div className="pb-20">
            <h1 className="text-3xl font-black text-slate-900 mb-8">Test Management</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-2">
                                <div className="h-6 w-16 bg-slate-100 rounded" />
                                <div className="h-6 w-12 bg-slate-100 rounded-full" />
                            </div>
                            <div className="h-6 w-20 bg-slate-100 rounded-lg" />
                        </div>
                        <div className="h-5 w-3/4 bg-slate-100 rounded mb-2" />
                        <div className="h-4 w-1/2 bg-slate-100 rounded mb-6" />
                        <div className="h-px bg-slate-100 mb-4" />
                        <div className="grid grid-cols-3 gap-2">
                            <div className="h-10 bg-slate-100 rounded-lg" />
                            <div className="h-10 bg-slate-100 rounded-lg" />
                            <div className="h-10 bg-slate-100 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // Summary stats
    const totalAttempts = tests.reduce((acc, t) => acc + (t.attemptCount || 0), 0);
    const liveTests = tests.filter(t => getTestTimeState(t) === 'live').length;
    const scheduledTests = tests.filter(t => getTestTimeState(t) === 'scheduled').length;

    return (
        <div className="pb-20 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Test Management</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {tests.length} test{tests.length !== 1 ? 's' : ''} created
                    </p>
                </div>
                <button
                    onClick={() => navigate('/institution/create-test')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#2278B0] text-white font-bold rounded-xl text-sm hover:bg-[#1b5f8a] transition-all shadow-sm hover:shadow-md"
                >
                    <ClipboardList size={16} />
                    Create New Test
                </button>
            </div>

            {/* Summary stats bar */}
            {tests.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                            <ClipboardList size={12} /> Total Tests
                        </div>
                        <div className="text-2xl font-black text-slate-800">{tests.length}</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                            <Users size={12} /> Total Attempts
                        </div>
                        <div className="text-2xl font-black text-slate-800">{totalAttempts}</div>
                    </div>
                    <div className="bg-green-50 rounded-2xl border border-green-100 p-4 shadow-sm">
                        <div className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" /> Live
                        </div>
                        <div className="text-2xl font-black text-green-700">{liveTests}</div>
                    </div>
                    <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 shadow-sm">
                        <div className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                            <Timer size={12} /> Scheduled
                        </div>
                        <div className="text-2xl font-black text-amber-700">{scheduledTests}</div>
                    </div>
                </div>
            )}

            {tests.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <ClipboardList size={28} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No tests yet</h3>
                    <p className="text-slate-400 text-sm mb-6">Create your first test and start tracking student performance.</p>
                    <button
                        onClick={() => navigate('/institution/create-test')}
                        className="px-6 py-2.5 bg-[#2278B0] text-white font-bold rounded-xl text-sm hover:bg-[#1b5f8a] transition-all shadow-sm"
                    >
                        + Create a Test
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map(test => {
                        const timeState = getTestTimeState(test);
                        const startDate = test.scheduledStart?.toDate ? test.scheduledStart.toDate() : null;
                        const endDate = test.scheduledEnd?.toDate ? test.scheduledEnd.toDate() : null;
                        const attemptCount = test.attemptCount || 0;
                        const avgScore = attemptCount > 0 && test.totalScoreSum
                            ? Math.round(test.totalScoreSum / attemptCount)
                            : null;
                        const maxScore = (test.questions?.length || 0) * 4;

                        return (
                            <div
                                key={test.id}
                                onClick={() => navigate(`/institution/test/${test.id}`)}
                                className={`group bg-white rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col ${
                                    timeState === 'ended'
                                        ? 'border-slate-200 hover:border-slate-300'
                                        : timeState === 'scheduled'
                                        ? 'border-amber-100 hover:border-amber-200'
                                        : 'border-slate-100 hover:border-blue-200'
                                }`}
                            >
                                {/* Card Header */}
                                <div className="p-5 pb-4 flex-1">
                                    {/* Top row: badges + code copy */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wide">
                                                {test.subject}
                                            </span>
                                            {timeState === 'live' && (
                                                <span className="text-[10px] bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> LIVE
                                                </span>
                                            )}
                                            {timeState === 'scheduled' && (
                                                <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                    <Timer size={10} /> SCHEDULED
                                                </span>
                                            )}
                                            {timeState === 'ended' && (
                                                <span className="text-[10px] bg-slate-100 text-slate-500 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                    <CheckCircle size={10} /> ENDED
                                                </span>
                                            )}
                                            {/* Access type badge */}
                                            {test.accessType === 'private' ? (
                                                <span className="text-[10px] bg-purple-50 text-purple-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Lock size={9} /> PRIVATE
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-sky-50 text-sky-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Globe size={9} /> PUBLIC
                                                </span>
                                            )}
                                        </div>
                                        {/* View analytics arrow */}
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-[#2278B0] transition-colors shrink-0 ml-1" />
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-[15px] font-bold text-slate-800 mb-1 line-clamp-2 leading-snug">
                                        {test.title}
                                    </h3>

                                    {/* Meta pills */}
                                    <div className="flex items-center gap-2 flex-wrap mt-3">
                                        <StatPill icon={<Clock size={11} />} value={`${test.duration}m`} />
                                        <StatPill icon={<ListChecks size={11} />} value={`${test.questions?.length || 0} Qs`} />
                                    </div>

                                    {/* Copyable test code */}
                                    {test.testCode && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Code:</span>
                                            <CopyButton value={test.testCode} label="test code" />
                                        </div>
                                    )}

                                    {/* Schedule Info */}
                                    {test.isScheduled && startDate && endDate && (
                                        <div className="text-xs text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <Calendar size={11} className="text-slate-400 shrink-0" />
                                            <span className="font-medium">
                                                {startDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                {' → '}
                                                {endDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Stats Footer */}
                                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {/* Attempt count */}
                                        <div className="flex items-center gap-1.5">
                                            <Users size={13} className="text-slate-400" />
                                            <span className="text-xs font-black text-slate-700">{attemptCount}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">attempts</span>
                                        </div>
                                        {/* Avg score */}
                                        {avgScore !== null ? (
                                            <div className="flex items-center gap-1.5">
                                                <TrendingUp size={13} className="text-green-500" />
                                                <span className="text-xs font-black text-slate-700">{avgScore}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">avg score</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <AlertCircle size={13} className="text-slate-300" />
                                                <span className="text-[10px] text-slate-400 font-medium">No attempts yet</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-bold text-[#2278B0] opacity-0 group-hover:opacity-100 transition-opacity">
                                        <BarChart2 size={13} />
                                        Analytics
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TestManager;
