import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Clock, Play, Users, RefreshCw, GraduationCap, AlertCircle, Download, Timer, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { batchService } from '../../features/exam-engine/services/batchService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Skeleton } from '../ui/Skeleton';
import logger from '../../utils/logger';

const StudentClassroom = ({ userData, startInstitutionTest }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [batches, setBatches] = useState([]);
    const [assignedTests, setAssignedTests] = useState([]);
    const [startingTestId, setStartingTestId] = useState(null);

    // Helper to compute test time state
    const getTestTimeState = (test) => {
        if (!test.isScheduled || (!test.scheduledStart && !test.scheduledEnd)) return 'live';
        const now = new Date();
        const start = test.scheduledStart?.toDate ? test.scheduledStart.toDate() : (test.scheduledStart ? new Date(test.scheduledStart) : null);
        const end = test.scheduledEnd?.toDate ? test.scheduledEnd.toDate() : (test.scheduledEnd ? new Date(test.scheduledEnd) : null);
        if (start && now < start) return 'upcoming';
        if (end && now > end) return 'ended';
        return 'live';
    };

    const loadClassroom = useCallback(async () => {
        if (!userData?.uid) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Get enrolled batches from user's enrolledBatches field
            const myBatches = await batchService.getStudentBatches(userData.uid);
            setBatches(myBatches);

            if (myBatches.length > 0) {
                const batchIds = myBatches.map(b => b.id);

                // 2. Fetch tests assigned to any of these batches.
                // We use ONLY array-contains-any (no secondary where/orderBy)
                // to avoid needing a composite Firestore index.
                // Client-side sorting handles ordering.
                const chunks = [];
                for (let i = 0; i < batchIds.length; i += 10) {
                    chunks.push(batchIds.slice(i, i + 10));
                }

                const allTestDocs = [];
                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'institution_tests'),
                        where('assignedBatchIds', 'array-contains-any', chunk)
                    );
                    const snap = await getDocs(q);
                    snap.docs.forEach(d => {
                        // Deduplicate if a test appears in multiple batch chunks
                        if (!allTestDocs.find(t => t.id === d.id)) {
                            allTestDocs.push({ id: d.id, ...d.data() });
                        }
                    });
                }

                // 3. Client-side filter: only active tests
                const activeTests = allTestDocs
                    .filter(t => t.status !== 'archived' && t.status !== 'inactive')
                    .sort((a, b) => {
                        const ta = a.createdAt?.seconds || 0;
                        const tb = b.createdAt?.seconds || 0;
                        return tb - ta;
                    });

                setAssignedTests(activeTests);
            } else {
                setAssignedTests([]);
            }
        } catch (err) {
            logger.error('Failed to load classroom', err);
            setError('Failed to load classroom data. Please try refreshing.');
        } finally {
            setLoading(false);
        }
    }, [userData?.uid]);

    useEffect(() => {
        loadClassroom();
    }, [loadClassroom]);

    const handleStartTest = async (test) => {
        setStartingTestId(test.id);
        try {
            const success = await startInstitutionTest(test);
            if (success) navigate('/test');
        } finally {
            setStartingTestId(null);
        }
    };

    // --- Loading State ---
    if (loading) {
        return (
            <div className="space-y-6 p-2">
                <Skeleton className="h-52 w-full rounded-3xl" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-4">
                        <Skeleton className="h-8 w-40 rounded-lg" />
                        <Skeleton className="h-32 w-full rounded-2xl" />
                        <Skeleton className="h-32 w-full rounded-2xl" />
                    </div>
                    <div className="lg:col-span-4 space-y-4">
                        <Skeleton className="h-8 w-32 rounded-lg" />
                        <Skeleton className="h-48 w-full rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    // --- Error State ---
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <AlertCircle size={48} className="text-red-400" />
                <p className="text-slate-600 font-medium text-center max-w-sm">{error}</p>
                <button
                    onClick={loadClassroom}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <RefreshCw size={16} /> Try Again
                </button>
            </div>
        );
    }

    // --- Not Enrolled State ---
    if (batches.length === 0) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                    <div className="relative z-10">
                        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                            <BookOpen className="text-white/80" /> My Classroom
                        </h1>
                        <p className="text-indigo-100 font-medium">
                            You haven't been added to any institution batch yet.
                        </p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                    <GraduationCap size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="font-bold text-slate-700 mb-2">No Batches Yet</h3>
                    <p className="text-slate-400 text-sm">Ask your institution to add you to a batch using your email: <span className="font-bold text-slate-600">{userData?.email}</span></p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Stats Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                                <BookOpen className="text-white/80" /> My Classroom
                            </h1>
                            <p className="text-indigo-100 font-medium max-w-lg">
                                Access tests and materials assigned by your institution.
                            </p>
                        </div>
                        <button
                            onClick={loadClassroom}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[120px]">
                            <div className="text-3xl font-black">{batches.length}</div>
                            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Active Batches</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[120px]">
                            <div className="text-3xl font-black">{assignedTests.length}</div>
                            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Pending Tests</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Main: Assigned Tests */}
                <div className="lg:col-span-8 space-y-6">
                    <h2 className="text-xl font-bold text-slate-800">Assigned Tests</h2>

                    {assignedTests.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Clock size={32} />
                            </div>
                            <h3 className="font-bold text-slate-700">No Pending Tests</h3>
                            <p className="text-slate-400 text-sm mt-1">You're all caught up! Check back later.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {assignedTests.map(test => {
                                const timeState = getTestTimeState(test);
                                const startDate = test.scheduledStart?.toDate ? test.scheduledStart.toDate() : null;
                                const endDate = test.scheduledEnd?.toDate ? test.scheduledEnd.toDate() : null;

                                return (
                                    <div key={test.id} className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all group ${timeState === 'ended' ? 'border-red-100 bg-red-50/30' : timeState === 'upcoming' ? 'border-amber-100 bg-amber-50/30' : 'border-slate-100'
                                        }`}>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide">
                                                        {test.subject || 'Test'}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                        <Clock size={12} /> {test.duration} mins
                                                    </span>
                                                    {/* Time State Badge */}
                                                    {timeState === 'live' && (
                                                        <span className="text-[10px] bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 animate-pulse">
                                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> LIVE
                                                        </span>
                                                    )}
                                                    {timeState === 'upcoming' && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                            <Timer size={10} /> UPCOMING
                                                        </span>
                                                    )}
                                                    {timeState === 'ended' && (
                                                        <span className="text-[10px] bg-red-100 text-red-600 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                            <CheckCircle size={10} /> ENDED
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                                    {test.title}
                                                </h3>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    By <span className="font-semibold">{test.creatorName || 'Institution'}</span>
                                                </p>

                                                {/* Schedule Info */}
                                                {test.isScheduled && startDate && endDate && (
                                                    <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                                        <Clock size={11} />
                                                        {startDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        {' → '}
                                                        {endDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}

                                                {/* Batch tags */}
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {batches
                                                        .filter(b => test.assignedBatchIds?.includes(b.id))
                                                        .map(b => (
                                                            <span key={b.id} className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                                                                {b.name}
                                                            </span>
                                                        ))
                                                    }
                                                </div>
                                            </div>

                                            {/* Action Button based on time state */}
                                            <div className="flex-shrink-0">
                                                {timeState === 'live' && (
                                                    <button
                                                        onClick={() => handleStartTest(test)}
                                                        disabled={startingTestId === test.id}
                                                        className="bg-indigo-50 text-indigo-600 p-3 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all disabled:opacity-50"
                                                    >
                                                        {startingTestId === test.id
                                                            ? <RefreshCw size={20} className="animate-spin" />
                                                            : <Play size={20} fill="currentColor" />
                                                        }
                                                    </button>
                                                )}
                                                {timeState === 'upcoming' && (
                                                    <div className="bg-amber-50 text-amber-600 p-3 rounded-xl opacity-60 cursor-not-allowed" title="Test hasn't started yet">
                                                        <Timer size={20} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ended Test Actions */}
                                        {timeState === 'ended' && (
                                            <div className="mt-4 pt-4 border-t border-red-100">
                                                <p className="text-sm text-red-600 font-bold mb-3">This live test has ended. Would you like to practice it anyway?</p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleStartTest(test)}
                                                        disabled={startingTestId === test.id}
                                                        className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {startingTestId === test.id ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                                                        Practice Anyway
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const content = test.questions?.map((q, i) => `Q${i + 1}. ${q.text}\n${q.options?.map((o, j) => `  ${String.fromCharCode(65 + j)}. ${o}`).join('\n')}\nAnswer: ${q.correctAnswer}\n`).join('\n') || '';
                                                            const blob = new Blob([`${test.title}\n${test.subject}\n\n${content}`], { type: 'text/plain' });
                                                            const link = document.createElement('a');
                                                            link.href = URL.createObjectURL(blob);
                                                            link.download = `${test.title.replace(/\s+/g, '_')}.txt`;
                                                            link.click();
                                                        }}
                                                        className="py-2.5 px-5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
                                                    >
                                                        <Download size={14} /> Download
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar: My Batches */}
                <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">My Batches</h2>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-50">
                            {batches.map(batch => {
                                // Count tests assigned to this specific batch
                                const batchTestCount = assignedTests.filter(t =>
                                    t.assignedBatchIds?.includes(batch.id)
                                ).length;

                                return (
                                    <div key={batch.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="font-bold text-slate-700 text-sm">{batch.name}</div>
                                            {batchTestCount > 0 && (
                                                <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                                                    {batchTestCount} test{batchTestCount !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                            <Users size={11} /> {batch.studentCount || 0} Students
                                        </div>
                                        {batchTestCount === 0 && (
                                            <div className="text-[10px] text-slate-300 mt-1 italic">No tests assigned yet</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentClassroom;
