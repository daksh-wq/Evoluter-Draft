import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks';
import {
    Clock, CheckCircle, XCircle, AlertCircle, ArrowRight,
    Filter, RefreshCw, Trophy, Calendar, BarChart3, ChevronDown
} from 'lucide-react';
import logger from '../../utils/logger';
import { getCachedOrFetch, removeFromCache, CACHE_TTL } from '../../services/cacheService';
import { showToast } from '../../utils/errorHandler';
import { CustomDropdown } from '../common';

/**
 * TestHistoryView Component
 * Displays a list of all past tests with filtering and sorting
 */
const TestHistoryView = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [testHistory, setTestHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTopic, setFilterTopic] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [fetchError, setFetchError] = useState(false);

    const fetchHistory = useCallback(async (forceRefresh = false) => {
        if (!user?.uid) return;
        setLoading(true);
        setFetchError(false);

        try {
            const cacheKey = `test_history_${user.uid}`;

            // Force refresh: clear cache first
            if (forceRefresh) {
                removeFromCache(cacheKey);
            }

            const tests = await getCachedOrFetch(
                cacheKey,
                async () => {
                    const testsRef = collection(db, `users/${user.uid}/tests`);
                    const q = query(testsRef, orderBy('completedAt', 'desc'));
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            completedAt: data.completedAt || data.timestamp // Fallback for old records
                        };
                    });
                },
                CACHE_TTL.GENERAL // 5 minutes
            );

            setTestHistory(tests || []);
            logger.info('Fetched test history', { count: tests?.length || 0, cached: !forceRefresh });
        } catch (error) {
            logger.error('Failed to fetch test history', error);
            setFetchError(true);
            showToast('Failed to load test history. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Get unique topics for filter
    const topics = useMemo(() => {
        const uniqueTopics = [...new Set(testHistory.map(t => t.topic).filter(Boolean))];
        return uniqueTopics.sort();
    }, [testHistory]);

    // Filter and sort
    const filteredTests = useMemo(() => {
        let result = testHistory;

        if (filterTopic === 'institution') {
            result = result.filter(t => t.type === 'institution');
        } else if (filterTopic !== 'all') {
            result = result.filter(t => t.topic === filterTopic);
        }

        if (sortBy === 'score') {
            result = [...result].sort((a, b) => (b.score || 0) - (a.score || 0));
        } else if (sortBy === 'accuracy') {
            result = [...result].sort((a, b) => {
                const accA = a.totalQuestions ? (a.correct || 0) / a.totalQuestions : 0;
                const accB = b.totalQuestions ? (b.correct || 0) / b.totalQuestions : 0;
                return accB - accA;
            });
        } else if (sortBy === 'date') {
            // Explicitly sort by date (latest to oldest) to ensure correct order
            result = [...result].sort((a, b) => {
                const getTime = (val) => {
                    if (!val) return 0;
                    try {
                        if (val.toDate && typeof val.toDate === 'function') return val.toDate().getTime();
                        if (val.seconds !== undefined) return val.seconds * 1000;
                        if (val._seconds !== undefined) return val._seconds * 1000;
                        const parsed = new Date(val).getTime();
                        return isNaN(parsed) ? 0 : parsed;
                    } catch (e) {
                        return 0;
                    }
                };
                return getTime(b.completedAt) - getTime(a.completedAt); // Descending
            });
        }

        return result;
    }, [testHistory, filterTopic, sortBy]);

    // Stats
    const stats = useMemo(() => {
        if (testHistory.length === 0) return null;
        const totalTests = testHistory.length;
        const avgScore = Math.round(testHistory.reduce((sum, t) => sum + (t.score || 0), 0) / totalTests);
        const totalQuestions = testHistory.reduce((sum, t) => sum + (t.totalQuestions || 0), 0);
        const bestScore = Math.max(...testHistory.map(t => t.score || 0));
        return { totalTests, avgScore, totalQuestions, bestScore };
    }, [testHistory]);

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        
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
                // Fallback for weird strings that evaluate to numbers
                if (isNaN(date.getTime()) && !isNaN(Number(timestamp))) {
                    date = new Date(Number(timestamp));
                }
            }

            // Final safety check against objects like {} generating an Invalid Date
            if (isNaN(date.getTime())) return 'Unknown Date';

            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Unknown Date';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto text-[#2278B0] mb-4" size={32} />
                    <p className="text-slate-500 font-medium">Loading test history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 mb-2">Test History</h1>
                        <p className="text-slate-500 font-medium">Review your past performance and track your progress</p>
                    </div>
                    <button
                        onClick={() => fetchHistory(true)}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-[#2278B0] hover:bg-slate-50 rounded-xl transition-all"
                        title="Refresh History"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <BarChart3 size={20} className="text-[#2278B0]" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stats.totalTests}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tests Taken</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                <CheckCircle size={20} className="text-green-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stats.avgScore}%</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Score</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Trophy size={20} className="text-purple-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stats.bestScore}%</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Best Score</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                <AlertCircle size={20} className="text-orange-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stats.totalQuestions}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Questions</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mr-1">
                    <Filter size={11} /> Filters
                </span>
                
                <CustomDropdown
                    label="All Tests"
                    options={[
                        { label: 'All Tests', value: 'all' },
                        { label: '🏫 Institution Tests', value: 'institution' },
                        ...topics.map(t => ({ label: t, value: t }))
                    ]}
                    value={filterTopic}
                    onChange={setFilterTopic}
                    initialShowCount={8}
                    isFilter={true}
                />

                <CustomDropdown
                    label="Sort By"
                    options={[
                        { label: 'Sort by Date', value: 'date' },
                        { label: 'Sort by Score', value: 'score' },
                        { label: 'Sort by Accuracy', value: 'accuracy' }
                    ]}
                    value={sortBy}
                    onChange={setSortBy}
                    initialShowCount={5}
                />
            </div>

            {/* Empty State / Test List */}
            {filteredTests.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-sm border border-slate-100 flex flex-col items-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                        <Clock size={28} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">
                        {testHistory.length === 0 ? 'No Tests Yet' : 'No Tests Match Filter'}
                    </h3>
                    <p className="text-slate-500 text-sm">
                        {testHistory.length === 0
                            ? 'Complete your first test to see your history here.'
                            : 'Try adjusting your filters to see more results.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTests.map((test, index) => {
                        const accuracy = test.totalQuestions
                            ? Math.round(((test.correct || 0) / test.totalQuestions) * 100)
                            : test.score || 0;
                        const isPassed = accuracy >= 50;

                        return (
                            <div
                                key={test.id}
                                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-200 cursor-pointer group"
                                onClick={() => navigate(`/test-history/${test.id}`)}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isPassed
                                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                                }`}>
                                                {isPassed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                {isPassed ? 'Passed' : 'Needs Improvement'}
                                            </span>
                                            {test.type === 'institution' && (
                                                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                                                    🏫 Institution
                                                </span>
                                            )}
                                            {test.difficulty && (
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                                                    {test.difficulty}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                                            {test.testName || test.topic || test.testName || 'Practice Test'}
                                        </h3>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {formatDate(test.completedAt)}
                                            </span>
                                            <span>{test.totalQuestions || 0} questions</span>
                                            {test.xpEarned && (
                                                <span className="text-[#2278B0] font-bold">+{test.xpEarned} XP</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-3xl font-black text-[#2278B0]">{accuracy}%</p>
                                            <p className="text-xs text-slate-500 font-medium">
                                                {test.correct || 0}/{test.totalQuestions || 0} correct
                                            </p>
                                        </div>
                                        <ArrowRight size={20} className="text-slate-300 group-hover:text-[#2278B0] transition-colors" />
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

export default TestHistoryView;
