import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ArrowLeft, Users, Clock, Search, Zap, Trophy, Medal, Award, AlertTriangle, ListChecks, BookOpen } from 'lucide-react';
import logger from '../../utils/logger';
import { Skeleton } from '../ui/Skeleton';

const TestAnalytics = () => {
    const { testId } = useParams();
    const navigate = useNavigate();

    const [testData, setTestData] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAttempt, setSelectedAttempt] = useState(null);

    useEffect(() => {
        const fetchTestDetails = async () => {
            if (!testId) return;

            try {
                // 1. Fetch Test Meta
                const testRef = doc(db, 'institution_tests', testId);
                const testSnap = await getDoc(testRef);

                if (testSnap.exists()) {
                    setTestData({ id: testSnap.id, ...testSnap.data() });
                }

                // 2. Fetch Attempts
                const attemptsRef = collection(db, 'institution_tests', testId, 'attempts');
                const attemptsSnap = await getDocs(attemptsRef);

                const rawAttemptsList = [];
                attemptsSnap.forEach(doc => {
                    rawAttemptsList.push({ id: doc.id, ...doc.data() });
                });

                // Deduplicate attempts: keep only the latest attempt per student
                const latestAttemptsMap = new Map();
                rawAttemptsList.forEach(attempt => {
                    const identifier = attempt.studentEmail || attempt.studentName;
                    if (!identifier) return; // Skip invalid entries

                    if (!latestAttemptsMap.has(identifier)) {
                        latestAttemptsMap.set(identifier, attempt);
                    } else {
                        const existing = latestAttemptsMap.get(identifier);
                        const existingTime = existing.submittedAt?.toMillis ? existing.submittedAt.toMillis() : 0;
                        const currTime = attempt.submittedAt?.toMillis ? attempt.submittedAt.toMillis() : 0;
                        
                        if (currTime > existingTime) {
                            latestAttemptsMap.set(identifier, attempt);
                        }
                    }
                });

                const finalAttemptsList = Array.from(latestAttemptsMap.values());

                // Sort by high score
                finalAttemptsList.sort((a, b) => (b.score || 0) - (a.score || 0));

                setAttempts(finalAttemptsList);

            } catch (error) {
                logger.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTestDetails();
    }, [testId]);

    const filteredAttempts = attempts.filter(a =>
        a.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm h-16 flex items-center px-6">
                    <Skeleton className="h-8 w-64" />
                </header>
                <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-32 rounded-2xl" />
                        ))}
                    </div>
                    <Skeleton className="h-96 rounded-3xl" />
                </main>
            </div>
        );
    }

    if (!testData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                    <Search size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Test Not Found</h3>
                <p className="text-slate-500 text-sm max-w-xs text-center">We couldn't find the test report you're looking for. It might have been deleted.</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors shadow-sm">
                    Go Back
                </button>
            </div>
        );
    }

    const highestScore = attempts.length > 0
        ? Math.max(...attempts.map(a => a.score || 0))
        : 0;

    if (selectedAttempt) {
        const formattedQuestions = testData.questions.map((q, idx) => {
            const options = q.options || [];
            const correctAnswerIndex = options.indexOf(q.correctAnswer);
            const qId = q.id || `inst-${idx}`;
            const actualCorrect = correctAnswerIndex >= 0 ? correctAnswerIndex : 0;

            return {
                id: qId,
                text: q.text,
                questionType: q.questionType,
                difficulty: q.difficulty,
                options,
                correctAnswer: actualCorrect,
                explanation: q.explanation,
                solution: q.solution
            };
        });

        const answers = selectedAttempt.answers || {};

        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedAttempt(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-xl font-bold text-slate-800 truncate max-w-md">
                                {selectedAttempt.studentName}'s Attempt
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                             <span className="font-black text-slate-700 text-lg">
                                 Score: {selectedAttempt.score} <span className="text-xs font-medium text-slate-400">/ {testData.questions.length * 4}</span>
                             </span>
                        </div>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
                    <div className="flex gap-4 border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
                        <div className="pb-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap text-[#2278B0] border-b-2 border-[#2278B0]">
                            <ListChecks size={16} /> Question Review
                        </div>
                    </div>

                    <div className="space-y-4 animate-in fade-in">
                        {formattedQuestions.map((q, idx) => {
                            const userAnswer = answers[q.id];
                            const isCorrect = userAnswer === q.correctAnswer;
                            const isSkipped = userAnswer === undefined || userAnswer === null;

                            let statusColor = isCorrect ? 'border-green-200 bg-green-50' : (isSkipped ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50');

                            return (
                                <div key={q.id} className={`p-6 rounded-2xl border ${statusColor}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Question {idx + 1}</span>
                                            {q.difficulty && (
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${q.difficulty.toLowerCase() === 'hard' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    q.difficulty.toLowerCase() === 'intermediate' || q.difficulty.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                        'bg-green-50 text-green-600 border-green-100'
                                                    }`}>
                                                    {q.difficulty}
                                                </span>
                                            )}
                                            {q.questionType && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                    {q.questionType}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${isCorrect ? 'bg-green-100 text-green-700' : (isSkipped ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-700')}`}>
                                            {isCorrect ? 'Correct' : (isSkipped ? 'Skipped' : 'Incorrect')}
                                        </span>
                                    </div>
                                    <div className="mb-4">
                                        {(() => {
                                            const parts = q.text
                                                .replace(/([a-z.?!])\s+(?=(?:\d{1,2}|[A-Da-d])\.\s)/gi, '$1\n')
                                                .replace(/([a-z.?'")])\s+(?=(Which of the|Which following|Which among|Which one|How many|Select the|Choose the|Identify the)\b)/gi, '$1\n')
                                                .split(/\n|(?=(?:^|\s)(?:\d{1,2}|[A-Da-d])\.\s)/g)
                                                .map(p => p.trim())
                                                .filter(Boolean);

                                            const rawChunks = [];
                                            let currentStmtGroup = [];

                                            const flushCurrentStmts = () => {
                                                if (currentStmtGroup.length > 0) {
                                                    rawChunks.push({ type: 'statements', items: currentStmtGroup });
                                                    currentStmtGroup = [];
                                                }
                                            };

                                            parts.forEach(p => {
                                                const isStatement = /^(?:\d{1,2}|[A-Da-d])\./.test(p);
                                                if (isStatement) {
                                                    currentStmtGroup.push(p);
                                                } else {
                                                    flushCurrentStmts();
                                                    rawChunks.push({ type: 'text', content: p });
                                                }
                                            });
                                            flushCurrentStmts();

                                            const blocks = [];
                                            for (let i = 0; i < rawChunks.length; i++) {
                                                const chunk = rawChunks[i];

                                                if (chunk.type === 'text' && /^\s*List[-\s]?(?:I|1)\s*:?\s*$/i.test(chunk.content)) {
                                                    if (
                                                        i + 3 < rawChunks.length &&
                                                        rawChunks[i + 1].type === 'statements' &&
                                                        rawChunks[i + 2].type === 'text' && /^\s*List[-\s]?(?:II|2)\s*:?\s*$/i.test(rawChunks[i + 2].content) &&
                                                        rawChunks[i + 3].type === 'statements'
                                                    ) {
                                                        blocks.push(
                                                            <div key={`match-${i}`} className="mb-4 w-full grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                                                <div>
                                                                    <div className="font-bold text-slate-800 mb-2 ml-1">{chunk.content}</div>
                                                                    <div className="flex flex-col gap-2">
                                                                        {rawChunks[i + 1].items.map((stmt, idx) => (
                                                                            <div key={idx} className="pl-3 text-slate-700 font-medium bg-white p-2 rounded-md border-l-2 border-slate-300 text-sm flex gap-2 items-start h-full shadow-sm">
                                                                                <span className="shrink-0 font-bold text-slate-500">{stmt.match(/^(?:\d{1,2}|[A-Da-d])\./)[0]}</span>
                                                                                <span className="flex-1">{stmt.replace(/^(?:\d{1,2}|[A-Da-d])\.\s*/, '')}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-800 mb-2 ml-1">{rawChunks[i + 2].content}</div>
                                                                    <div className="flex flex-col gap-2">
                                                                        {rawChunks[i + 3].items.map((stmt, idx) => (
                                                                            <div key={idx} className="pl-3 text-slate-700 font-medium bg-white p-2 rounded-md border-l-2 border-slate-300 text-sm flex gap-2 items-start h-full shadow-sm">
                                                                                <span className="shrink-0 font-bold text-slate-500">{stmt.match(/^(?:\d{1,2}|[A-Da-d])\./)[0]}</span>
                                                                                <span className="flex-1">{stmt.replace(/^(?:\d{1,2}|[A-Da-d])\.\s*/, '')}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                        i += 3;
                                                        continue;
                                                    }
                                                }

                                                if (chunk.type === 'statements') {
                                                    const isShort4 = chunk.items.length === 4 && !chunk.items.some(s => s.split(' ').length > 12);
                                                    blocks.push(
                                                        <div key={`group-${i}`} className={`mb-2 w-full grid gap-2 ${isShort4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                                            {chunk.items.map((stmt, idx) => (
                                                                <div key={idx} className="pl-3 text-slate-700 font-medium bg-slate-50/50 p-2 rounded-lg border-l-2 border-slate-300 text-sm flex gap-2 items-start h-full">
                                                                    <span className="shrink-0 font-bold text-slate-500">{stmt.match(/^(?:\d{1,2}|[A-Da-d])\./)[0]}</span>
                                                                    <span className="flex-1">{stmt.replace(/^(?:\d{1,2}|[A-Da-d])\.\s*/, '')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                } else {
                                                    blocks.push(
                                                        <div key={`p-${i}`} className="mb-2 font-medium text-slate-800">
                                                            {chunk.content}
                                                        </div>
                                                    );
                                                }
                                            }
                                            return blocks;
                                        })()}
                                    </div>
                                    <div className="space-y-2">
                                        {q.options.map((rawOpt, i) => {
                                            const opt = typeof rawOpt === 'string' ? rawOpt.replace(/^([a-dA-D]|\d+)[.)]\s*/, '').trim() : rawOpt;
                                            const isSelected = i === userAnswer;
                                            const isCorrectOption = i === q.correctAnswer;
                                            
                                            return (
                                                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm border ${isCorrectOption ? 'bg-green-100 border-green-200' : (isSelected ? 'bg-red-100 border-red-200' : 'bg-white border-slate-100')
                                                    }`}>
                                                    <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${isCorrectOption ? 'bg-green-500 text-white' : (isSelected ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500')
                                                        }`}>
                                                        {String.fromCharCode(65 + i)}
                                                    </div>
                                                    <span className={isCorrectOption ? 'font-bold text-green-900' : (isSelected ? 'font-bold text-red-900' : 'text-slate-600')}>{opt}</span>
                                                    
                                                    <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-2">
                                                        {isSelected && (
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border hidden sm:inline-block ${isCorrectOption ? 'bg-green-200/50 text-green-800 border-green-300' : 'bg-red-200/50 text-red-800 border-red-300'}`}>
                                                                Your Answer
                                                            </span>
                                                        )}
                                                        {isCorrectOption && !isSelected && (
                                                            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded border bg-green-200/50 text-green-800 border-green-300 hidden sm:inline-block">
                                                                Correct Answer
                                                            </span>
                                                        )}
                                                        {isCorrectOption && isSelected && (
                                                            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded border bg-green-200/50 text-green-800 border-green-300 hidden sm:inline-block">
                                                                Correct Answer
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {q.solution ? (
                                        <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
                                            {(q.solution.correctAnswerReason || q.solution.correct_explanation) && (
                                                <div>
                                                    <span className="font-bold text-slate-800 text-sm">✅ Correct Answer:</span>
                                                    <p className="text-sm text-slate-600 mt-1">{q.solution.correctAnswerReason || q.solution.correct_explanation}</p>
                                                </div>
                                            )}
                                            {(q.solution.sourceOfQuestion || q.solution.possible_source) && (
                                                <div className="flex items-start gap-2 text-xs text-slate-500">
                                                    <BookOpen size={14} className="mt-0.5 shrink-0 text-indigo-400" />
                                                    <span><span className="font-semibold text-indigo-600">Source:</span> {q.solution.sourceOfQuestion || q.solution.possible_source}</span>
                                                </div>
                                            )}
                                            {(q.solution.approachToSolve || q.solution.solving_approach) && (
                                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                                    <span className="font-bold text-blue-800 text-xs uppercase tracking-wider">💡 Approach to Solve:</span>
                                                    <p className="text-sm text-blue-700 mt-1">{q.solution.approachToSolve || q.solution.solving_approach}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : q.explanation && (
                                        <div className="mt-4 pt-4 border-t border-slate-200/50">
                                            <p className="text-sm text-slate-600">
                                                <span className="font-bold text-slate-800">Explanation:</span> {q.explanation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 truncate max-w-md">
                            {testData.title} <span className="text-slate-400 font-medium text-sm ml-2">Report</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                            Code: {testData.testCode}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                            <Users size={14} /> Total Attempts
                        </div>
                        <div className="text-3xl font-black text-slate-800">{attempts.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                            <Zap size={14} /> Highest Score
                        </div>
                        <div className="text-3xl font-black text-green-600">{highestScore}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                            <Clock size={14} /> Avg. Duration
                        </div>
                        <div className="text-3xl font-black text-slate-800">
                            {attempts.length > 0
                                ? Math.round(attempts.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0) / attempts.length / 60)
                                : 0
                            }m
                        </div>
                    </div>
                </div>
                {/* Students List */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-slate-800">Student Leaderboard</h3>

                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
                            />
                        </div>
                    </div>

                    {filteredAttempts.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
                                <Users size={32} className="text-slate-300" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900">No attempts found</h4>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                {searchTerm ? `No results for "${searchTerm}"` : 'Share the test link with students to start seeing results here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="py-4 pl-6 font-bold text-slate-400 text-xs uppercase tracking-wider">Rank</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Student Name</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Score</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Time Taken</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Warnings</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Status</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Submitted</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredAttempts.map((attempt, index) => (
                                        <tr key={attempt.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-4 pl-6">
                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-slate-200 text-slate-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-800' : 'text-slate-400'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <div className="font-bold text-slate-800">{attempt.studentName}</div>
                                                <div className="text-xs text-slate-400">{attempt.studentEmail}</div>
                                            </td>
                                            <td className="py-4">
                                                <div className="font-black text-slate-700 text-lg">
                                                    {attempt.score} <span className="text-xs font-medium text-slate-400">/ {testData.questions.length * 4}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-sm font-medium text-slate-600">
                                                {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                            </td>
                                            <td className="py-4">
                                                {(attempt.warningCount || 0) > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold">
                                                        <AlertTriangle size={11} />
                                                        {attempt.warningCount}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-xs font-bold">—</span>
                                                )}
                                            </td>
                                            <td className="py-4">
                                                {attempt.status === 'terminated' ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold uppercase">
                                                            Terminated
                                                        </span>
                                                        {attempt.terminationReason && (
                                                            <div className="text-[10px] text-red-500 max-w-[150px] leading-tight mt-1">
                                                                {attempt.terminationReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold uppercase">
                                                        Completed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 text-xs font-bold text-slate-400 uppercase">
                                                {attempt.submittedAt?.toDate
                                                    ? attempt.submittedAt.toDate().toLocaleDateString()
                                                    : 'Unknown'}
                                            </td>
                                            <td className="py-4">
                                                <button
                                                    onClick={() => setSelectedAttempt(attempt)}
                                                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                                                >
                                                    View Report
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TestAnalytics;
