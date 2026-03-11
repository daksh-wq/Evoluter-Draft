import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebase';
import { collection, getDocs, limit, query, orderBy, startAfter, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Search, MoreVertical, Shield, Trash2, Ban } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = async (isNext = false) => {
        setLoading(true);
        try {
            let q = query(
                collection(db, 'users'),
                orderBy('createdAt', 'desc'), // Assuming 'createdAt' exists, fallback to 'email' if not
                limit(20)
            );

            if (isNext && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const userList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            setUsers(prev => isNext ? [...prev, ...userList] : userList);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAction = (userId, action) => {
        console.log(`Action ${action} on user ${userId}`);
        // Implement Ban / Delete logic here
        // alert(`Action ${action} coming soon`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                                {user.displayName?.[0] || user.email?.[0] || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{user.displayName || 'Unknown'}</div>
                                                <div className="text-xs text-slate-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-500">User</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button title="Ban User" className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors">
                                                <Ban size={16} />
                                            </button>
                                            <button title="Delete" className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Load More */}
                {users.length > 0 && (
                    <div className="p-4 border-t border-slate-200 text-center">
                        <button
                            onClick={() => fetchUsers(true)}
                            disabled={loading}
                            className="text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
