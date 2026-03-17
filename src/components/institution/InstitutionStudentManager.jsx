import React, { useState, useEffect, useCallback } from 'react';
import {
    UserCheck, UserPlus, Trash2, Search, X, Users, AlertTriangle
} from 'lucide-react';
import {
    collection, query, where, getDocs, addDoc, deleteDoc,
    doc, serverTimestamp, getDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Skeleton } from '../ui/Skeleton';
import { toast } from '../../utils/toast';
import logger from '../../utils/logger';
import { arrayUnion } from 'firebase/firestore';

/**
 * InstitutionStudentManager
 * Allows an institution to view and manage their registered student pool.
 * Students are stored in /institutions/{instId}/students/{studentId}
 * Admins can set a maxStudentsAllowed limit on the institution document.
 */
const InstitutionStudentManager = ({ userData }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [adding, setAdding] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [addError, setAddError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [maxAllowed, setMaxAllowed] = useState(10); // default

    const instId = userData?.uid;

    const fetchStudents = useCallback(async () => {
        if (!instId) return;
        setLoading(true);
        try {
            // Also fetch the institution doc to get maxStudentsAllowed
            const instDocRef = doc(db, 'users', instId);
            const instDoc = await getDoc(instDocRef);
            if (instDoc.exists()) {
                setMaxAllowed(instDoc.data().maxStudentsAllowed ?? 10);
            }

            const q = query(collection(db, 'institutions', instId, 'students'));
            const snap = await getDocs(q);
            const studentList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setStudents(studentList);
        } catch (error) {
            logger.error('Failed to fetch institution students', error);
            toast.error('Could not load students. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [instId]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setAddError('');
        const emails = emailInput.split(',').map(em => em.trim()).filter(Boolean);

        if (emails.length === 0) {
            setAddError('Please enter at least one email address.');
            return;
        }

        if (students.length + emails.length > maxAllowed) {
            setAddError(
                `Cannot add. You are allowed ${maxAllowed} student(s) total. ` +
                `You currently have ${students.length} and are trying to add ${emails.length}.`
            );
            return;
        }

        setAdding(true);
        let successCount = 0;
        const errors = [];

        for (const email of emails) {
            try {
                // Check if student already added
                if (students.some(s => s.studentEmail?.toLowerCase() === email.toLowerCase())) {
                    errors.push(`${email} (already added)`);
                    continue;
                }
                // Find the user's uid by looking up their email in /users collection
                const usersQuery = query(
                    collection(db, 'users'),
                    where('email', '==', email.toLowerCase())
                );
                const usersSnap = await getDocs(usersQuery);

                if (usersSnap.empty) {
                    errors.push(`${email} (no account found with this email)`);
                    continue;
                }

                const studentDoc = usersSnap.docs[0];
                const studentData = studentDoc.data();

                const instDocRef = doc(db, 'users', instId);
                const instDocForName = await getDoc(instDocRef);
                const instNameObj = instDocForName.exists() ? instDocForName.data() : {};
                const instName = instNameObj.displayName || instNameObj.name || 'Institution';

                await addDoc(collection(db, 'institutions', instId, 'students'), {
                    studentId: studentDoc.id,
                    studentEmail: email.toLowerCase(),
                    studentName: studentData.name || studentData.displayName || email.split('@')[0],
                    addedAt: serverTimestamp(),
                });

                // Add to student's user doc
                const studentUserRef = doc(db, 'users', studentDoc.id);
                const { updateDoc } = await import('firebase/firestore');
                await updateDoc(studentUserRef, {
                    joinedInstitutions: arrayUnion(instId)
                }).catch(async (e) => {
                    // if it fails because it doesn't exist, use setDoc with merge
                    const { setDoc } = await import('firebase/firestore');
                    await setDoc(studentUserRef, {
                        joinedInstitutions: arrayUnion(instId)
                    }, { merge: true });
                });

                successCount++;
            } catch (error) {
                logger.error(`Failed to add student ${email}`, error);
                errors.push(`${email} (${error.message || 'error'})`);
            }
        }

        if (successCount > 0) {
            toast.success(`Successfully added ${successCount} student(s).`);
            setEmailInput('');
            await fetchStudents();
        }

        if (errors.length > 0) {
            setAddError(`Issues: ${errors.join(', ')}`);
        }

        if (successCount === 0 && errors.length === 0) {
            setAddError('No valid students were added.');
        }

        setAdding(false);
        if (successCount > 0 && errors.length === 0) {
            setShowAddModal(false);
        }
    };

    const handleRemoveStudent = async (studentDocId) => {
        if (!window.confirm('Remove this student from your institution?')) return;
        try {
            await deleteDoc(doc(db, 'institutions', instId, 'students', studentDocId));
            setStudents(prev => prev.filter(s => s.id !== studentDocId));
            toast.success('Student removed.');
        } catch (error) {
            logger.error('Failed to remove student', error);
            toast.error('Failed to remove student.');
        }
    };

    const filteredStudents = students.filter(s =>
        s.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const limitUsedPercent = Math.min((students.length / maxAllowed) * 100, 100);
    const atLimit = students.length >= maxAllowed;

    return (
        <div className="space-y-6 px-4 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2">
                        <UserCheck size={28} className="text-indigo-600" />
                        Students
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Students you add here can be enrolled in batches.
                    </p>
                </div>
                <button
                    onClick={() => { setShowAddModal(true); setAddError(''); setEmailInput(''); }}
                    disabled={atLimit}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${atLimit
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                        }`}
                >
                    <UserPlus size={16} /> Add Student
                </button>
            </div>

            {/* Limit Usage Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">Student Slots Used</span>
                    <span className={`text-sm font-black ${atLimit ? 'text-red-500' : 'text-indigo-600'}`}>
                        {students.length} / {maxAllowed}
                    </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${atLimit ? 'bg-red-500' : limitUsedPercent > 75 ? 'bg-amber-400' : 'bg-indigo-500'
                            }`}
                        style={{ width: `${limitUsedPercent}%` }}
                    />
                </div>
                {atLimit && (
                    <div className="mt-2 flex items-center gap-2 text-red-500 text-xs font-medium">
                        <AlertTriangle size={14} />
                        You have reached your student limit. Contact admin to increase your limit.
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
            </div>

            {/* Student List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                            <Users size={28} className="text-indigo-400" />
                        </div>
                        <h3 className="font-bold text-slate-700 text-lg">No students yet</h3>
                        <p className="text-slate-400 text-sm mt-1">Add students by email to get started.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4 hidden sm:table-cell">Email</th>
                                <th className="px-6 py-4 hidden md:table-cell">Added</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-10 text-center text-slate-400">
                                        No students matching your search.
                                    </td>
                                </tr>
                            ) : filteredStudents.map(student => (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm shrink-0">
                                                {(student.studentName || 'S')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800">{student.studentName || 'Unknown'}</div>
                                                <div className="text-xs text-slate-400 sm:hidden">{student.studentEmail}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 hidden sm:table-cell text-slate-500">{student.studentEmail}</td>
                                    <td className="px-6 py-3 hidden md:table-cell text-slate-400">
                                        {student.addedAt?.toDate ? student.addedAt.toDate().toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button
                                            onClick={() => handleRemoveStudent(student.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Remove student"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-900">Add Student(s)</h3>
                            <button
                                onClick={() => { setShowAddModal(false); setAddError(''); }}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 mb-4">
                            Enter the email address(es) of existing Evoluter student accounts. Separate multiple emails with commas.
                        </p>

                        <div className="text-xs font-bold text-slate-500 mb-1">
                            Slots remaining: <span className="text-indigo-600">{maxAllowed - students.length}</span> / {maxAllowed}
                        </div>

                        <form onSubmit={handleAddStudent}>
                            <textarea
                                autoFocus
                                rows={3}
                                placeholder="e.g. student1@gmail.com, student2@gmail.com"
                                value={emailInput}
                                onChange={e => { setEmailInput(e.target.value); setAddError(''); }}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-2 resize-none"
                            />
                            {addError && (
                                <div className="text-red-500 text-xs font-medium mb-3 flex items-start gap-1.5">
                                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                    {addError}
                                </div>
                            )}
                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setAddError(''); }}
                                    className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adding || !emailInput.trim()}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {adding ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <><UserPlus size={16} /> Add</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstitutionStudentManager;
