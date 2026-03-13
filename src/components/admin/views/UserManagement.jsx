import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebase';
import {
    collection, getDocs, limit, query, where, orderBy,
    startAfter, updateDoc, doc
} from 'firebase/firestore';
import { Search, Building2, Users, Edit2, Check, X } from 'lucide-react';
import { toast } from '../../../utils/toast';

const UserManagement = () => {
    const [tab, setTab] = useState('students'); // 'students' | 'institutions'
    const [users, setUsers] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingLimit, setEditingLimit] = useState(null); // { id, value }

    const fetchUsers = async (isNext = false) => {
        setLoading(true);
        try {
            let q = query(
                collection(db, 'users'),
                where('role', 'in', ['student']),
                orderBy('__name__'),
                limit(20)
            );
            if (isNext && lastDoc) q = query(q, startAfter(lastDoc));
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

    const fetchInstitutions = async (isNext = false) => {
        setLoading(true);
        try {
            let q = query(
                collection(db, 'users'),
                where('role', '==', 'institution'),
                orderBy('__name__'),
                limit(20)
            );
            if (isNext && lastDoc) q = query(q, startAfter(lastDoc));
            const snapshot = await getDocs(q);
            const instList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setInstitutions(prev => isNext ? [...prev, ...instList] : instList);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        } catch (error) {
            console.error('Error fetching institutions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLastDoc(null);
        if (tab === 'students') fetchUsers();
        else fetchInstitutions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const handleSaveLimit = async (instId) => {
        const newLimit = parseInt(editingLimit.value, 10);
        if (isNaN(newLimit) || newLimit < 0) {
            toast.error('Please enter a valid number (0 or more).');
            return;
        }
        try {
            await updateDoc(doc(db, 'users', instId), { maxStudentsAllowed: newLimit });
            setInstitutions(prev =>
                prev.map(inst => inst.id === instId ? { ...inst, maxStudentsAllowed: newLimit } : inst)
            );
            toast.success('Student limit updated successfully!');
            setEditingLimit(null);
        } catch (error) {
            console.error('Failed to update limit:', error);
            toast.error('Failed to update limit. Check Firestore rules.');
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name || u.displayName || u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredInstitutions = institutions.filter(inst =>
        (inst.name || inst.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Users & Institutions</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage students, institutions, and set student limits.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                {[
                    { key: 'students', label: 'Students', icon: Users },
                    { key: 'institutions', label: 'Institutions', icon: Building2 },
                ].map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => { setTab(key); setSearchTerm(''); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                            tab === key
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Icon size={16} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Students Table */}
            {tab === 'students' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Exam</th>
                                    <th className="px-6 py-4">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                                                    {(user.name || user.displayName || user.email || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{user.name || user.displayName || 'Unknown'}</div>
                                                    <div className="text-xs text-slate-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-1 rounded-full">
                                                {user.targetExam || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                                            No students found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {users.length > 0 && (
                        <div className="p-4 border-t border-slate-100 text-center">
                            <button
                                onClick={() => fetchUsers(true)}
                                disabled={loading}
                                className="text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-50 text-sm"
                            >
                                {loading ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Institutions Table */}
            {tab === 'institutions' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Institution</th>
                                    <th className="px-6 py-4">Joined</th>
                                    <th className="px-6 py-4 text-center">Max Students Allowed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredInstitutions.map((inst) => (
                                    <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">
                                                    {(inst.name || inst.email || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{inst.name || 'Unnamed'}</div>
                                                    <div className="text-xs text-slate-400">{inst.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {inst.createdAt ? new Date(inst.createdAt.seconds * 1000).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {editingLimit?.id === inst.id ? (
                                                    <>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editingLimit.value}
                                                            onChange={e => setEditingLimit(l => ({ ...l, value: e.target.value }))}
                                                            className="w-20 px-2 py-1 border border-indigo-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleSaveLimit(inst.id)}
                                                            className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                                            title="Save"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingLimit(null)}
                                                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                                                            title="Cancel"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="font-bold text-slate-800 text-base">
                                                            {inst.maxStudentsAllowed ?? 10}
                                                        </span>
                                                        <button
                                                            onClick={() => setEditingLimit({ id: inst.id, value: String(inst.maxStudentsAllowed ?? 10) })}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Edit limit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredInstitutions.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                                            No institutions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {institutions.length > 0 && (
                        <div className="p-4 border-t border-slate-100 text-center">
                            <button
                                onClick={() => fetchInstitutions(true)}
                                disabled={loading}
                                className="text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-50 text-sm"
                            >
                                {loading ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserManagement;
