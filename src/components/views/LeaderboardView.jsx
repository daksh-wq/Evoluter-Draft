import React, { useEffect, useState } from 'react';
import { Trophy, Flame, Award } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, where, getCountFromServer } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import logger from '../../utils/logger';

/**
 * LeaderboardView Component
 * Displays ranking of users with gamification stats
 */
const LeaderboardView = () => {
    const [user] = useAuthState(auth);
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRank, setUserRank] = useState(null);
    const [totalUsers, setTotalUsers] = useState(0);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Fetch top 10 leaders
                const q = query(
                    collection(db, 'users'),
                    orderBy('stats.xp', 'desc'),
                    limit(10)
                );
                const querySnapshot = await getDocs(q);
                const fetchedLeaders = querySnapshot.docs.map((doc, index) => ({
                    id: doc.id,
                    rank: index + 1,
                    name: doc.data().displayName || 'Anonymous',
                    xp: doc.data().stats?.xp || 0,
                    streak: doc.data().stats?.streakDays || 0,
                    status: (doc.data().stats?.level || 1) > 10 ? 'Master' : 'Student'
                }));
                setLeaders(fetchedLeaders);

                // Get total user count
                const usersCollection = collection(db, 'users');
                const countSnapshot = await getCountFromServer(usersCollection);
                setTotalUsers(countSnapshot.data().count);

                // Calculate current user's rank if logged in
                if (user) {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userXP = userDoc.data().stats?.xp || 0;

                        // Check if user is in top 10
                        const userInTop10 = fetchedLeaders.find(leader => leader.id === user.uid);

                        if (userInTop10) {
                            setUserRank({
                                rank: userInTop10.rank,
                                isInTop10: true,
                                xp: userXP,
                                name: userDoc.data().displayName || 'You',
                                streak: userDoc.data().stats?.streakDays || 0
                            });
                        } else {
                            // Calculate rank by counting users with higher XP
                            const higherXPQuery = query(
                                collection(db, 'users'),
                                where('stats.xp', '>', userXP)
                            );
                            const higherXPSnapshot = await getCountFromServer(higherXPQuery);
                            const rank = higherXPSnapshot.data().count + 1;

                            setUserRank({
                                rank,
                                isInTop10: false,
                                xp: userXP,
                                name: userDoc.data().displayName || 'You',
                                streak: userDoc.data().stats?.streakDays || 0
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error("Error fetching leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [user]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-extrabold text-indigo-950 tracking-tight">
                    Leaderboard
                </h1>
                <p className="text-slate-500 mt-1">Compare your progress with peers.</p>
            </header>

            {/* Your Rank Card (if not in top 10) */}
            {userRank && !userRank.isInTop10 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                                <Award size={24} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Your Rank</div>
                                <div className="text-2xl font-black text-indigo-950">
                                    #{userRank.rank} <span className="text-sm font-normal text-slate-500">/ {totalUsers} users</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-indigo-950">{userRank.xp} XP</div>
                            <div className="text-xs text-orange-500 font-bold flex items-center justify-end gap-1">
                                <Flame size={10} /> {userRank.streak}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 bg-gradient-to-r from-indigo-950 to-indigo-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">Global Rankings</h3>
                        <p className="text-slate-400 text-sm">Real-time stats</p>
                    </div>
                    <Trophy size={32} className="text-yellow-400" />
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading rankings...</div>
                ) : leaders.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No active users yet. Be the first!</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {leaders.map((leader) => {
                            const isCurrentUser = user && leader.id === user.uid;
                            return (
                                <div
                                    key={leader.id}
                                    className={`flex items-center px-6 py-4 transition-colors ${isCurrentUser
                                        ? 'bg-blue-50 border-l-4 border-blue-600'
                                        : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-4 ${leader.rank <= 3
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-slate-100 text-slate-500'
                                            }`}
                                    >
                                        #{leader.rank}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            {leader.name}
                                            {isCurrentUser && (
                                                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">You</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500">{leader.status}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-indigo-950">{leader.xp} XP</div>
                                        <div className="text-xs text-orange-500 font-bold flex items-center justify-end gap-1">
                                            <Flame size={10} /> {leader.streak}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderboardView;

