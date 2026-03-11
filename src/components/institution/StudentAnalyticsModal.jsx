import React, { useState, useEffect } from 'react';
import { X, Target, Clock, BarChart2, BookOpen, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { formatTime } from '../../utils/helpers';
import logger from '../../utils/logger';

const StudentAnalyticsModal = ({ student, institutionId, onClose }) => {
    const [testHistory, setTestHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        testsTaken: 0,
        avgScore: 0,
        avgAccuracy: 0,
    });

    useEffect(() => {
        const fetchStudentHistory = async () => {
            if (!student?.studentId || !institutionId) return;

            try {
                // Fetch the tests this specific student has taken
                // In our current schema, test results are saved in users/{uid}/tests
                // But we need to filter by tests belonging to this institution.
                // Since test objects have institutionId/creatorId saved, we can filter locally or by query if indexed.
                // Assuming we query users/{studentId}/tests
                const testsRef = collection(db, 'users', student.studentId, 'tests');
                // We'll fetch all and filter locally for now to avoid needing complex indexes immediately
                const q = query(testsRef, orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);

                const institutionTests = [];
                let totalScore = 0;
                let totalAccuracy = 0;

                snapshot.forEach(doc => {
                    const data = doc.data();
                    // If the test result record has an institutionTestId, it was created by an institution
                    // We only want to show tests created by THIS institution
                    if (data.type === 'institution' || data.institutionTestId) {
                        // Assuming institution ID is passed down as a prop if we need strict matching, 
                        // but usually an institution dashboard only cares about their own tests.
                        institutionTests.push({ id: doc.id, ...data });
                        totalScore += (data.score || 0);

                        const accuracy = data.totalQuestions > 0
                            ? ((data.correct || 0) / data.totalQuestions) * 100
                            : 0;
                        totalAccuracy += accuracy;
                    }
                });

                setTestHistory(institutionTests);

                setStats({
                    testsTaken: institutionTests.length,
                    avgScore: institutionTests.length > 0 ? Math.round(totalScore / institutionTests.length) : 0,
                    avgAccuracy: institutionTests.length > 0 ? Math.round(totalAccuracy / institutionTests.length) : 0
                });

            } catch (error) {
                logger.error("Failed to fetch student tests:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentHistory();
    }, [student, institutionId]);

    if (!student) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xl uppercase">
                            {student.studentName?.charAt(0) || student.studentEmail?.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{student.studentName || 'Student Report'}</h2>
                            <p className="text-sm text-slate-500 font-medium">{student.studentEmail}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-white flex-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats Overview */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col">
                                    <div className="flex items-center gap-2 mb-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                                        <BookOpen size={16} /> Tests Taken
                                    </div>
                                    <span className="text-3xl font-black text-slate-900">{stats.testsTaken}</span>
                                </div>
                                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex flex-col">
                                    <div className="flex items-center gap-2 mb-2 text-green-600 font-bold text-sm uppercase tracking-wider">
                                        <Target size={16} /> Avg Accuracy
                                    </div>
                                    <span className="text-3xl font-black text-slate-900">{stats.avgAccuracy}%</span>
                                </div>
                                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex flex-col">
                                    <div className="flex items-center gap-2 mb-2 text-purple-600 font-bold text-sm uppercase tracking-wider">
                                        <BarChart2 size={16} /> Avg Score
                                    </div>
                                    <span className="text-3xl font-black text-slate-900">{stats.avgScore}%</span>
                                </div>
                            </div>

                            {/* Test History List */}
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                    <Clock size={20} className="text-indigo-500" /> Exam Timeline
                                </h3>

                                {testHistory.length === 0 ? (
                                    <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100">
                                        <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <AlertCircle size={24} />
                                        </div>
                                        <p className="text-slate-500 font-medium">This student hasn't taken any institution tests yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {testHistory.map((test) => (
                                            <div key={test.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-indigo-200 transition-colors">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{test.testName || test.topic || 'Untitled Test'}</h4>
                                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                                        {test.createdAt?.toDate ? test.createdAt.toDate().toLocaleDateString('en-US', {
                                                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        }) : 'Just now'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-6 text-sm text-right">
                                                    <div>
                                                        <span className="block text-slate-400 text-xs font-bold uppercase mb-0.5">Score</span>
                                                        <span className={`font-black ${test.score >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {test.score}%
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-slate-400 text-xs font-bold uppercase mb-0.5">Questions</span>
                                                        <span className="font-bold text-slate-700">{test.correct || 0} / {test.totalQuestions || 0}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-slate-400 text-xs font-bold uppercase mb-0.5">Time</span>
                                                        <span className="font-bold text-slate-700">{formatTime(test.timeTaken || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAnalyticsModal;
