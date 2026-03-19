import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebase';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { Users, Building2, Activity, AlertTriangle } from 'lucide-react';
import logger from '../../../utils/logger';

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="text-white" size={24} />
            </div>
        </div>
    </div>
);

const DashboardOverview = () => {
    const [stats, setStats] = useState({ totalStudents: 0, totalInstitutions: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const usersRef = collection(db, 'users');

                const [studSnap, instSnap] = await Promise.all([
                    getCountFromServer(query(usersRef, where('role', '==', 'student'))),
                    getCountFromServer(query(usersRef, where('role', '==', 'institution'))),
                ]);

                setStats({
                    totalStudents: studSnap.data().count,
                    totalInstitutions: instSnap.data().count,
                });
            } catch (error) {
                logger.error('Error fetching admin stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">System Overview</h1>
                <p className="text-slate-500 text-sm mt-0.5">Platform-wide statistics and management.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Students"
                    value={loading ? '...' : stats.totalStudents}
                    subtitle="Registered student accounts"
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Total Institutions"
                    value={loading ? '...' : stats.totalInstitutions}
                    subtitle="Registered institutions"
                    icon={Building2}
                    color="bg-emerald-500"
                />
                <StatCard
                    title="System Health"
                    value="Good"
                    subtitle="All services operational"
                    icon={Activity}
                    color="bg-[#2278B0]"
                />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Admin Panel — Quick Tips
                </h3>
                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Go to <strong>Users &amp; Institutions</strong> to manage students and set institution student limits.</li>
                    <li>Set a user's <code>role</code> to <code>admin</code> in Firestore to grant admin access.</li>
                    <li>Default student limit per institution is <strong>10</strong>. Edit it per institution as needed.</li>
                </ul>
            </div>
        </div>
    );
};

export default DashboardOverview;
