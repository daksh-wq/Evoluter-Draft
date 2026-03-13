import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, UserPlus, Search, X, Download, BookOpen, FileText, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { batchService } from '../../features/exam-engine/services/batchService';
import logger from '../../utils/logger';
import { Skeleton } from '../ui/Skeleton';
import StudentAnalyticsModal from './StudentAnalyticsModal';
import { toast } from '../../utils/toast';

const BatchManager = ({ userData }) => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBatchName, setNewBatchName] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const emailInputRef = React.useRef(null);

    // Institution Student Pool
    const [studentPool, setStudentPool] = useState([]); // students from /institutions/{id}/students
    const [selectedPoolStudents, setSelectedPoolStudents] = useState([]); // checked students to add
    const [showStudentPicker, setShowStudentPicker] = useState(false);
    const [poolSearch, setPoolSearch] = useState('');

    // Member Management
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchBatches();
        fetchStudentPool();
    }, [userData]);

    const fetchStudentPool = async () => {
        if (!userData?.uid) return;
        try {
            const q = query(collection(db, 'institutions', userData.uid, 'students'));
            const snap = await getDocs(q);
            setStudentPool(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            logger.error('Failed to fetch student pool', error);
        }
    };

    const fetchBatches = async () => {
        if (!userData?.uid) return;
        try {
            const data = await batchService.getInstitutionBatches(userData.uid);

            // Fetch tests to calculate MCQs done per batch
            const q = query(collection(db, 'institution_tests'), where('creatorId', '==', userData.uid));
            const testsSnap = await getDocs(q);
            const tests = testsSnap.docs.map(doc => doc.data());

            const updatedBatches = data.map(batch => {
                let mcqsDone = 0;
                tests.forEach(test => {
                    if (test.assignedBatchIds && test.assignedBatchIds.includes(batch.id)) {
                        const attempts = test.attemptCount || 0;
                        const qs = test.questions ? test.questions.length : 0;
                        mcqsDone += (attempts * qs);
                    }
                });
                return { ...batch, mcqsDone };
            });

            setBatches(updatedBatches);
        } catch (error) {
            logger.error("Failed to fetch batches", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBatch = async (e) => {
        e.preventDefault();
        if (!newBatchName.trim()) return;

        try {
            await batchService.createBatch(userData.uid, newBatchName);
            setNewBatchName('');
            setShowCreateModal(false);
            fetchBatches(); // Refresh list
        } catch (error) {
            logger.error("Failed to create batch", error);
            toast.error("Error creating batch: " + error.message);
        }
    };

    const handleSelectBatch = async (batch) => {
        setSelectedBatch(batch);
        setLoadingMembers(true);
        setMembers([]);
        setInviteError('');
        setInviteSuccess('');
        setSearchQuery('');

        try {
            const memberData = await batchService.getBatchMembers(batch.id);
            setMembers(memberData);
        } catch (error) {
            logger.error("Failed to fetch members", error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess('');
        setLoadingMembers(true);

        // Determine emails: prioritised from pool picker, fallback to email input
        let emails = [];
        if (selectedPoolStudents.length > 0) {
            emails = selectedPoolStudents.map(s => s.studentEmail).filter(Boolean);
        } else {
            const emailInput = emailInputRef.current?.value?.trim();
            if (!emailInput) {
                setInviteError('Please select students or enter an email.');
                setLoadingMembers(false);
                return;
            }
            emails = emailInput.split(',').map(e => e.trim()).filter(e => e);
        }

        if (!selectedBatch) {
            setInviteError('No batch selected.');
            setLoadingMembers(false);
            return;
        }

        let successCount = 0;
        let errors = [];

        for (const email of emails) {
            try {
                if (members.some(m => m.studentEmail === email)) {
                    errors.push(`${email} (Already in batch)`);
                    continue;
                }
                await batchService.addStudentToBatch(selectedBatch.id, email);
                successCount++;
            } catch (error) {
                logger.error(`Failed to add ${email}`, error);
                errors.push(`${email} (${error.message || 'Error'})`);
            }
        }

        if (successCount > 0) {
            setInviteSuccess(`Successfully added ${successCount} student(s).`);
            if (emailInputRef.current) emailInputRef.current.value = '';
            setSelectedPoolStudents([]);
            setShowStudentPicker(false);
            const memberData = await batchService.getBatchMembers(selectedBatch.id);
            setMembers(memberData);
            fetchBatches();
        }

        if (errors.length > 0) {
            setInviteError(`Failed to add:\n${errors.join('\n')}`);
        } else if (successCount === 0) {
            setInviteError('No valid students were added.');
        }

        setLoadingMembers(false);
    };

    const handleDeleteBatch = async (batchId) => {
        if (!window.confirm("Are you sure? This will remove the batch and student access.")) return;
        try {
            await batchService.deleteBatch(batchId);
            if (selectedBatch?.id === batchId) setSelectedBatch(null);
            fetchBatches();
        } catch (error) {
            logger.error("Failed to delete", error);
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (!window.confirm("Remove this student?")) return;
        try {
            await batchService.removeStudentFromBatch(selectedBatch.id, studentId);
            setMembers(prev => prev.filter(m => m.id !== studentId));
            fetchBatches(); // Update counts
        } catch (error) {
            logger.error("Failed to remove student", error);
        }
    };

    const handleExportCSV = () => {
        if (members.length === 0) return;

        const headers = ['Name', 'Email', 'Joined Date'];
        const csvContent = [
            headers.join(','),
            ...members.map(m => {
                const date = m.joinedAt?.toDate ? m.joinedAt.toDate().toLocaleDateString() : 'N/A';
                return `"${m.studentName || ''}","${m.studentEmail}","${date}"`;
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${selectedBatch.name.replace(/\s+/g, '_')}_Roster.csv`;
        link.click();
    };

    const filteredMembers = members.filter(m =>
        m.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar: Batches List */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50 flex flex-col md:max-h-none">
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Users size={18} className="text-indigo-600" /> My Batches
                    </h3>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                    ) : batches.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No batches yet. <br /> Create one to start adding students.
                        </div>
                    ) : (
                        batches.map(batch => (
                            <div
                                key={batch.id}
                                onClick={() => handleSelectBatch(batch)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedBatch?.id === batch.id
                                    ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50'
                                    : 'bg-white border-transparent hover:border-slate-200 shadow-sm'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="font-bold text-slate-800">{batch.name}</div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/institution/create-test?batchId=${batch.id}`); }}
                                            className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors p-1 rounded"
                                            title="Create Test for this Batch"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.id); }}
                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 mt-2 font-medium flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                        <Users size={12} /> {batch.studentCount || 0} Students
                                    </div>
                                    <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                                        <BookOpen size={12} /> {batch.mcqsDone || 0} MCQs Done
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area: Student List */}
            <div className="flex-1 flex flex-col bg-white min-h-[400px]">
                {selectedBatch ? (
                    <>
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">{selectedBatch.name}</h2>
                                <p className="text-xs text-slate-400 font-medium">Manage students in this batch</p>
                            </div>

                            <form onSubmit={handleAddStudent} className="flex flex-col gap-2 w-full md:w-auto">
                                {studentPool.length > 0 ? (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => { setShowStudentPicker(p => !p); setPoolSearch(''); }}
                                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                                        >
                                            <UserPlus size={16} />
                                            Select Students ({selectedPoolStudents.length > 0 ? selectedPoolStudents.length + ' selected' : studentPool.length + ' in pool'})
                                            <ChevronDown size={14} />
                                        </button>

                                        {showStudentPicker && (
                                            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl z-20">
                                                <div className="p-3 border-b border-slate-100">
                                                    <input
                                                        type="text"
                                                        placeholder="Search pool..."
                                                        value={poolSearch}
                                                        onChange={e => setPoolSearch(e.target.value)}
                                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                                                    />
                                                </div>
                                                <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                                                    {studentPool
                                                        .filter(s =>
                                                            (s.studentName || '').toLowerCase().includes(poolSearch.toLowerCase()) ||
                                                            (s.studentEmail || '').toLowerCase().includes(poolSearch.toLowerCase())
                                                        )
                                                        .filter(s => !members.some(m => m.studentEmail === s.studentEmail))
                                                        .map(s => (
                                                            <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedPoolStudents.some(p => p.id === s.id)}
                                                                    onChange={e => {
                                                                        if (e.target.checked) {
                                                                            setSelectedPoolStudents(prev => [...prev, s]);
                                                                        } else {
                                                                            setSelectedPoolStudents(prev => prev.filter(p => p.id !== s.id));
                                                                        }
                                                                    }}
                                                                    className="rounded accent-indigo-600"
                                                                />
                                                                <div>
                                                                    <div className="text-sm font-semibold text-slate-800">{s.studentName}</div>
                                                                    <div className="text-xs text-slate-400">{s.studentEmail}</div>
                                                                </div>
                                                            </label>
                                                        ))
                                                    }
                                                </div>
                                                {selectedPoolStudents.length > 0 && (
                                                    <div className="p-3 border-t border-slate-100">
                                                        <button
                                                            type="submit"
                                                            className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
                                                        >
                                                            Add {selectedPoolStudents.length} Student(s)
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            ref={emailInputRef}
                                            type="text"
                                            placeholder="Add emails (comma separated)..."
                                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
                                        />
                                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap flex items-center gap-1">
                                            <UserPlus size={16} /> Add
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Toolbar: Search & Export */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <button
                                onClick={handleExportCSV}
                                disabled={members.length === 0}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={16} className="text-slate-400" /> Export CSV
                            </button>
                        </div>

                        {/* Messages */}
                        {(inviteError || inviteSuccess) && (
                            <div className={`px-6 py-3 text-sm font-bold ${inviteError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {inviteError || inviteSuccess}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingMembers ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                                </div>
                            ) : members.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-300">
                                        <UserPlus size={24} />
                                    </div>
                                    <h4 className="font-bold text-slate-800">No students yet</h4>
                                    <p className="text-xs text-slate-500">Add students by email to verify access.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[500px] md:min-w-0">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                <th className="pb-3 pl-2">Name</th>
                                                <th className="pb-3">Email</th>
                                                <th className="pb-3 text-right pr-2">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredMembers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="py-8 text-center text-slate-500 text-sm">
                                                        No students found matching your search.
                                                    </td>
                                                </tr>
                                            ) : filteredMembers.map(member => (
                                                <tr key={member.id}
                                                    onClick={() => setSelectedStudent(member)}
                                                    className="group hover:bg-slate-50 font-medium text-slate-600 text-sm cursor-pointer transition-colors"
                                                >
                                                    <td className="py-3 pl-2 text-slate-900 font-bold">
                                                        {member.studentName}
                                                        <span className="ml-2 text-[10px] uppercase font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            View Stats
                                                        </span>
                                                    </td>
                                                    <td className="py-3">{member.studentEmail}</td>
                                                    <td className="py-3 text-right pr-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveStudent(member.id); }}
                                                            className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4 py-12 md:py-0">
                        <Users size={48} className="opacity-20" />
                        <p className="font-bold">Select a batch to manage</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-900">Create New Batch</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBatch}>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Batch Name</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. Class 10 - Physics"
                                value={newBatchName}
                                onChange={(e) => setNewBatchName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-6"
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all">
                                    Create Batch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Student Analytics Modal */}
            {selectedStudent && (
                <StudentAnalyticsModal
                    student={selectedStudent}
                    institutionId={userData?.uid}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </div>
    );
};

export default BatchManager;
