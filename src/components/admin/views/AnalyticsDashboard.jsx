import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebase';
import { collection, query, getCountFromServer, orderBy, limit, getDocs } from 'firebase/firestore';
import { BarChart2, PieChart, Activity, TrendingUp } from 'lucide-react';
import logger from '../../../utils/logger';

const AnalyticsDashboard = () => {
    const [stats, setStats] = useState({
        totalTests: 0,
        testsLast24h: 0,
        popularTopic: 'Calculating...',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // 1. Total Tests Generated (Count from cached_tests + unique sessions?)
                // Accessing collectionGroup 'test_sessions' for aggregate
                // Note: For large scale, you should use a scheduled function to aggregate these daily.
                // Here we do a lightweight estimation.

                // Using cached_tests as a proxy for generated content popularity
                const cachedColl = collection(db, 'cached_tests');
                const cachedSnapshot = await getCountFromServer(cachedColl);

                // Get recent tests to find popular topic
                const recentTestsQuery = query(collection(db, 'cached_tests'), orderBy('createdAt', 'desc'), limit(20));
                const recentTests = await getDocs(recentTestsQuery);

                let topics = {};
                recentTests.forEach(doc => {
                    const t = doc.data().topic;
                    topics[t] = (topics[t] || 0) + 1;
                });

                const popularTopic = Object.keys(topics).sort((a, b) => topics[b] - topics[a])[0] || 'N/A';

                setStats({
                    totalTests: cachedSnapshot.data().count, // This is just cached templates
                    testsLast24h: '12', // Mock for now as query is expensive without index
                    popularTopic,
                });

            } catch (error) {
                logger.error("Analytics error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Platform Analytics</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Cached Test Templates</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-2">{loading ? '...' : stats.totalTests}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Activity size={24} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4">Reusable templates saved</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Trending Topic</p>
                            <h3 className="text-xl font-bold text-slate-900 mt-2 truncate w-40" title={stats.popularTopic}>
                                {loading ? '...' : stats.popularTopic}
                            </h3>
                        </div>
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4">Based on last 20 generations</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Placeholder for Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col justify-center items-center text-slate-400">
                    <BarChart2 size={48} className="mb-4 opacity-20" />
                    <p>Usage Charts (Requires data aggregation)</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col justify-center items-center text-slate-400">
                    <PieChart size={48} className="mb-4 opacity-20" />
                    <p>Topic Distribution</p>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
