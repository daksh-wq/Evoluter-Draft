import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Users, MapPin, CheckCircle, Zap, ListChecks, Plus, ArrowRight, Clock, MoreVertical, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import logger from '../../utils/logger';
import { Skeleton } from '../ui/Skeleton';
import { batchService } from '../../features/exam-engine/services/batchService';
import { Trophy, BookOpen } from 'lucide-react';

const InstitutionDashboard = ({ userData }) => {
    const navigate = useNavigate();
    const profile = userData?.institutionProfile || {};

    // State
    const [stats, setStats] = useState({
        totalTests: 0,
        totalAttempts: 0,
        avgScore: 0,
        totalBatches: 0,
        totalStudents: 0,
        mcqsPracticed: 0
    });
    const [recentTests, setRecentTests] = useState([]);
    const [liveFeed, setLiveFeed] = useState([]);
    const [topPerformers, setTopPerformers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        if (!userData?.uid) return;

            try {
                // Fetch batches for stats
                const batches = await batchService.getInstitutionBatches(userData.uid);
                const totalBatches = batches.length;
                const totalStudents = batches.reduce((sum, b) => sum + (b.studentCount || 0), 0);

                const q = query(
                    collection(db, 'institution_tests'),
                    where('creatorId', '==', userData.uid),
                    orderBy('createdAt', 'desc')
                );

                const snapshot = await getDocs(q);

                let totalAttempts = 0;
                let totalScoreSum = 0;
                let mcqsPracticed = 0;
                const tests = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    tests.push({ id: doc.id, ...data });

                    const attempts = data.attemptCount || 0;
                    totalAttempts += attempts;
                    mcqsPracticed += attempts * (data.questions ? data.questions.length : 0);
                    totalScoreSum += (data.totalScoreSum || 0);
                });

                const avgScore = totalAttempts > 0
                    ? Math.round(totalScoreSum / totalAttempts)
                    : 0;

                setStats({
                    totalTests: tests.length,
                    totalAttempts,
                    avgScore,
                    totalBatches,
                    totalStudents,
                    mcqsPracticed
                });
                setRecentTests(tests);

                // Fetch Submissions for Live Feed and Leaderboard (only active tests)
                const allAttempts = [];
                const activeTests = tests.filter(t => t.status === 'active');

                await Promise.all(activeTests.map(async (test) => {
                    const attemptsRef = collection(db, 'institution_tests', test.id, 'attempts');
                    const attemptsSnap = await getDocs(query(attemptsRef));

                    attemptsSnap.forEach(doc => {
                        const data = doc.data();
                        allAttempts.push({
                            id: doc.id,
                            testName: test.title,
                            testId: test.id,
                            ...data
                        });
                    });
                }));

                // Calculate Top 10 Performers
                const studentAggregates = {};
                allAttempts.forEach(sub => {
                    const sid = sub.studentId;
                    if (!sid) return;
                    if (!studentAggregates[sid]) {
                        studentAggregates[sid] = {
                            studentId: sid,
                            studentName: sub.studentName || 'Unknown',
                            totalPercent: 0,
                            testsTaken: 0
                        };
                    }
                    studentAggregates[sid].totalPercent += (sub.percentage || 0);
                    studentAggregates[sid].testsTaken += 1;
                });

                const top10 = Object.values(studentAggregates)
                    .map(s => ({
                        ...s,
                        avgPercent: Math.round(s.totalPercent / s.testsTaken)
                    }))
                    .sort((a, b) => b.avgPercent - a.avgPercent)
                    .slice(0, 10);

                setTopPerformers(top10);

                // Sort by submittedAt descending and take top 10 for Live Feed
                allAttempts.sort((a, b) => {
                    const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(0);
                    const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(0);
                    return dateB - dateA;
                });

                setLiveFeed(allAttempts.slice(0, 10));

            } catch (error) {
                logger.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }, [userData?.uid]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return (
        <div className="space-y-8 px-4 animate-in fade-in duration-500 pb-20">
            {/* Header / Profile Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full translate-x-1/3 -translate-y-1/3" />

                <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-center text-center md:text-left">
                    {/* Logo */}
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                        {profile.logoUrl ? (
                            <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                                <Building2 size={32} />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 mb-2 justify-center md:justify-start">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900">{profile.name || 'Institution Name'}</h1>
                            {profile.isVerified && <CheckCircle size={20} className="text-blue-500" fill="currentColor" />}
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-medium text-slate-500">
                            {profile.city && (
                                <div className="flex items-center gap-1">
                                    <MapPin size={16} /> {profile.city}, {profile.state}
                                </div>
                            )}
                            {profile.studentCount && (
                                <div className="flex items-center gap-1">
                                    <Users size={16} /> ~{profile.studentCount} Students
                                </div>
                            )}
                        </div>
                    </div>

                    <Link to="/institution/create-test" className="w-full md:w-auto">
                        <button className="w-full md:w-auto bg-indigo-950 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-900 transition-all flex items-center justify-center gap-2">
                            <Plus size={20} /> Create New Test
                        </button>
                    </Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* New Stats */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Users size={18} /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batches</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.totalBatches}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600"><Users size={18} /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.totalStudents}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><BookOpen size={18} /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">MCQs Done</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.mcqsPracticed}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><ListChecks size={18} /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tests</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.totalTests}</div>
                </div>
            </div>

            {/* Live Activity Feed */}
            {liveFeed.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-indigo-500" /> Live Submissions Feed
                    </h3>
                    <div className="flex overflow-x-auto gap-4 pb-2 snap-x scrollbar-hide">
                        {liveFeed.map(sub => (
                            <button
                                key={sub.id}
                                type="button"
                                aria-label={`View report for ${sub.studentName}`}
                                className="min-w-[280px] md:min-w-[320px] bg-slate-50 border border-slate-100 rounded-2xl p-4 snap-start shrink-0 hover:border-indigo-200 transition-colors text-left"
                                onClick={() => navigate(`/institution/test/${sub.testId}`)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 truncate pr-2">{sub.studentName}</h4>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${sub.percentage >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {sub.percentage}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium truncate mb-3">
                                    Completed <span className="text-slate-700">{sub.testName}</span>
                                </p>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {Math.floor(sub.timeTaken / 60)}m {sub.timeTaken % 60}s</span>
                                    <span>{sub.submittedAt?.toDate ? sub.submittedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Top 10 Performers Leaderboard */}
            {topPerformers.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Trophy size={20} className="text-yellow-500" /> Overall Toppers (Live Tests)
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {topPerformers.map((student, idx) => (
                            <div key={student.studentId} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                                <div className="font-black text-xl text-slate-300 w-6">#{idx + 1}</div>
                                <div>
                                    <div className="font-bold text-slate-800 truncate max-w-[120px]">{student.studentName}</div>
                                    <div className="text-xs text-slate-500 font-medium">{student.avgPercent}% Avg Score</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Activity / Tests List */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-800">Recent Tests</h3>
                    {recentTests.length > 0 && (
                        <Link to="/institution/tests" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
                            View All
                        </Link>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between py-4 border-b border-slate-50">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-8 w-24 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : recentTests.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
                            <ListChecks size={32} className="text-slate-300" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">No tests created yet</h4>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">Create your first test to start tracking student performance.</p>
                        <Link to="/institution/create-test">
                            <button className="text-[#2278B0] font-bold hover:underline">
                                Create First Test &rarr;
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
                        <table className="w-full text-left border-collapse" style={{ minWidth: '560px' }}>
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 pl-6 md:pl-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Test Name</th>
                                    <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider hidden sm:table-cell">Subject</th>
                                    <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Attempts</th>
                                    <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">Created</th>
                                    <th className="py-4 text-right pr-6 md:pr-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentTests.map((test) => (
                                    <tr key={test.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 pl-6 md:pl-4">
                                            <div className="font-bold text-slate-800">{test.title}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-1">Code: {test.testCode}</div>
                                        </td>
                                        <td className="py-4 hidden sm:table-cell">
                                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                                                {test.subject}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-slate-400" />
                                                <span className="font-bold text-slate-700">{test.attemptCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm text-slate-500 font-medium hidden md:table-cell">
                                            {test.createdAt?.toDate ? test.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                        </td>
                                        <td className="py-4 pr-6 md:pr-4 text-right">
                                            <button
                                                onClick={() => navigate(`/institution/test/${test.id}`)}
                                                className="text-[#2278B0] font-bold text-sm hover:underline flex items-center gap-1 justify-end"
                                            >
                                                View Report <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstitutionDashboard;
