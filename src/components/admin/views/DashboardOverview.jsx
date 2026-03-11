import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebase';
import { collection, getCountFromServer, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Users, FileText, Activity, AlertTriangle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="text-white" size={24} />
            </div>
        </div>
    </div>
);

const DashboardOverview = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeTests: 0,
        todaysTests: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. Total Users (Count)
                const usersColl = collection(db, 'users');
                const usersSnapshot = await getCountFromServer(usersColl);

                // 2. Tests Generated Today (Estimate via cached_tests or similar)
                // For accurate daily stats we'd need a specific aggregation, 
                // but for now let's just count recent tests or use a placeholder if costly.
                // Let's use a simple query for "Active Sessions" instead.
                const sessionsColl = collection(db, 'test_sessions'); // CollectionGroup is better but costly
                // Note: querying collectionGroup 'test_sessions' requires an index we added.

                // Let's keep it light:
                setStats({
                    totalUsers: usersSnapshot.data().count,
                    activeTests: 'Calculating...',
                    todaysTests: 'N/A' // Requires stricter time query
                });

            } catch (error) {
                console.error('Error fetching admin stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">System Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Users"
                    value={loading ? '...' : stats.totalUsers}
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Active Tests"
                    value="--"
                    icon={Activity}
                    color="bg-green-500"
                />
                <StatCard
                    title="System Health"
                    value="Good"
                    icon={AlertTriangle}
                    color="bg-indigo-500"
                />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Beta Admin Panel
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                    This dashboard is currently in beta. Some statistics may be estimated to reduce database read costs.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h2>
                <div className="text-slate-500 text-sm italic">
                    Activity logs coming soon...
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
