import React, { useState } from 'react';
import { Search, Building2, Clock, ListChecks, ArrowRight, AlertCircle, Timer, Download, Play } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';

const StudentInstitutionView = ({ startInstitutionTest }) => {
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [foundTest, setFoundTest] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!code) return;

        setLoading(true);
        setError(null);
        setFoundTest(null);

        try {
            // Normalize code (uppercase, trim)
            const cleanCode = code.toUpperCase().trim();

            const q = query(
                collection(db, 'institution_tests'),
                where('testCode', '==', cleanCode)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setError('Invalid test code. Please check and try again.');
            } else {
                const doc = snapshot.docs[0];
                setFoundTest({ id: doc.id, ...doc.data() });
            }

        } catch (err) {
            logger.error("Error searching test:", err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async () => {
        if (!foundTest) return;

        const success = await startInstitutionTest(foundTest);
        if (success) {
            navigate('/test');
        } else {
            setError('Failed to start test. Please try again.');
        }
    };

    // Compute time state for a test
    const getTestTimeState = (test) => {
        if (!test || !test.isScheduled || (!test.scheduledStart && !test.scheduledEnd)) return 'live';
        const now = new Date();
        const start = test.scheduledStart?.toDate ? test.scheduledStart.toDate() : (test.scheduledStart ? new Date(test.scheduledStart) : null);
        const end = test.scheduledEnd?.toDate ? test.scheduledEnd.toDate() : (test.scheduledEnd ? new Date(test.scheduledEnd) : null);
        if (start && now < start) return 'upcoming';
        if (end && now > end) return 'ended';
        return 'live';
    };

    const testTimeState = foundTest ? getTestTimeState(foundTest) : null;
    const startDate = foundTest?.scheduledStart?.toDate ? foundTest.scheduledStart.toDate() : null;
    const endDate = foundTest?.scheduledEnd?.toDate ? foundTest.scheduledEnd.toDate() : null;

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <div className="text-center mb-10 space-y-4">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-900 mb-4">
                    <Building2 size={32} />
                </div>
                <h1 className="text-3xl font-black text-slate-900">Join Institution Test</h1>
                <p className="text-slate-500">Enter the 6-character code provided by your institution to start the test.</p>
            </div>

            {/* Search Box */}
            <div className="bg-white p-2 sm:p-3 rounded-2xl shadow-lg border border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-8 transform transition-all focus-within:ring-4 focus-within:ring-indigo-500/10">
                <div className="flex items-center flex-1 min-w-0 bg-slate-50 sm:bg-transparent rounded-xl px-2 sm:px-4">
                    <div className="text-slate-400 shrink-0 pl-2 sm:pl-0">
                        <Search size={20} />
                    </div>
                    <input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="Enter Code (e.g. X7K9P2)"
                        className="flex-1 min-w-0 py-3 sm:py-4 px-3 text-base sm:text-lg font-bold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-300 uppercase tracking-widest bg-transparent"
                        maxLength={6}
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading || !code}
                    className="w-full sm:w-auto bg-indigo-950 text-white px-6 sm:px-8 py-3.5 sm:py-3 rounded-xl font-bold hover:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                >
                    {loading ? 'Searching...' : 'Find Test'}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <span className="font-bold">{error}</span>
                </div>
            )}

            {/* Test Preview Card */}
            {foundTest && (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#2278B0]/5 p-8 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-[#2278B0] font-bold text-xs uppercase tracking-wider mb-2">
                            <Building2 size={14} />
                            {foundTest.creatorName || 'Institution Test'}
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">{foundTest.title}</h2>
                        <div className="text-slate-500 font-medium">{foundTest.subject}</div>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">Duration</div>
                                    <div className="font-bold text-slate-900">{foundTest.duration} Mins</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                                    <ListChecks size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">Questions</div>
                                    <div className="font-bold text-slate-900">{foundTest.questions?.length || 0} Qs</div>
                                </div>
                            </div>
                        </div>

                        {/* Schedule Info */}
                        {foundTest.isScheduled && startDate && endDate && (
                            <div className="text-xs text-slate-400 mb-4 flex items-center gap-1 bg-slate-50 p-3 rounded-xl">
                                <Clock size={12} />
                                {startDate.toLocaleString()} → {endDate.toLocaleString()}
                            </div>
                        )}

                        {/* Live — normal start */}
                        {testTimeState === 'live' && (
                            <button
                                onClick={handleStart}
                                className="w-full bg-[#2278B0] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1a5c8a] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                            >
                                Start Test Now <ArrowRight size={20} />
                            </button>
                        )}

                        {/* Upcoming — show message */}
                        {testTimeState === 'upcoming' && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-2xl text-center">
                                <Timer size={28} className="mx-auto mb-2 text-amber-500" />
                                <p className="font-bold text-lg">Test Hasn't Started Yet</p>
                                {startDate && <p className="text-sm mt-1">Starts at: <span className="font-bold">{startDate.toLocaleString()}</span></p>}
                            </div>
                        )}

                        {/* Ended — practice or download */}
                        {testTimeState === 'ended' && (
                            <div className="space-y-4">
                                <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl text-center">
                                    <p className="font-bold text-lg">This Live Test Has Ended</p>
                                    <p className="text-sm mt-1">Would you like to practice or download it?</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleStart}
                                        className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Play size={16} /> Practice Anyway
                                    </button>
                                    <button
                                        onClick={() => {
                                            const content = foundTest.questions?.map((q, i) => `Q${i + 1}. ${q.text}\n${q.options?.map((o, j) => `  ${String.fromCharCode(65 + j)}. ${o}`).join('\n')}\nAnswer: ${q.correctAnswer}\n`).join('\n') || '';
                                            const blob = new Blob([`${foundTest.title}\n${foundTest.subject}\n\n${content}`], { type: 'text/plain' });
                                            const link = document.createElement('a');
                                            link.href = URL.createObjectURL(blob);
                                            link.download = `${foundTest.title.replace(/\s+/g, '_')}.txt`;
                                            link.click();
                                        }}
                                        className="py-3.5 px-6 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
                                    >
                                        <Download size={16} /> Download
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentInstitutionView;
