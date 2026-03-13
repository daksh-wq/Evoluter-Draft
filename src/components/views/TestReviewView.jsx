import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks';
import {
    CheckCircle, XCircle, AlertCircle, ArrowLeft,
    RefreshCw, Clock, Brain, BookOpen
} from 'lucide-react';
import { formatTime } from '../../utils/helpers';
import logger from '../../utils/logger';

/**
 * TestReviewView Component
 * Displays detailed review of a specific past test with question-by-question breakdown
 */
const TestReviewView = () => {
    const { testId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTest = async () => {
            if (!user?.uid || !testId) return;
            setLoading(true);
            try {
                const testDoc = await getDoc(doc(db, `users/${user.uid}/tests`, testId));
                if (testDoc.exists()) {
                    setTestData({ id: testDoc.id, ...testDoc.data() });
                    logger.info('Loaded test review', { testId });
                } else {
                    setError('Test not found');
                    logger.warn('Test not found', { testId });
                }
            } catch (err) {
                logger.error('Failed to load test', err);
                setError('Failed to load test data');
            } finally {
                setLoading(false);
            }
        };

        fetchTest();
    }, [user?.uid, testId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto text-[#2278B0] mb-4" size={32} />
                    <p className="text-slate-500 font-medium">Loading test review...</p>
                </div>
            </div>
        );
    }

    if (error || !testData) {
        return (
            <div className="max-w-3xl mx-auto text-center py-20">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={28} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{error || 'Test Not Found'}</h2>
                <p className="text-slate-500 mb-6">The test you're looking for may have been deleted or doesn't exist.</p>
                <button
                    onClick={() => navigate('/test-history')}
                    className="bg-indigo-950 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-900 transition-all inline-flex items-center gap-2"
                >
                    <ArrowLeft size={18} /> Back to History
                </button>
            </div>
        );
    }

    const questions = testData.questions || [];
    const answers = testData.answers || {};
    const accuracy = testData.totalQuestions
        ? Math.round(((testData.correct || 0) / testData.totalQuestions) * 100)
        : testData.score || 0;

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back Navigation */}
            <button
                onClick={() => navigate('/test-history')}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm mb-6 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Test History
            </button>

            {/* Header Card */}
            <div className="bg-indigo-950 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#2278B0]/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">Test Review</p>
                            <h1 className="text-2xl font-black mb-1">
                                {testData.topic || testData.testName || 'Practice Test'}
                            </h1>
                            <p className="text-blue-200 text-sm">{formatDate(testData.completedAt)}</p>
                        </div>
                        <div className="text-center md:text-right">
                            <p className="text-5xl font-black">{accuracy}%</p>
                            <p className={`text-xs font-bold mt-1 px-3 py-1 rounded-full inline-block ${accuracy >= 50 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                {accuracy >= 50 ? 'Passed' : 'Needs Improvement'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                    <CheckCircle className="text-green-500 mx-auto mb-2" size={22} />
                    <p className="text-2xl font-bold text-slate-900">{testData.correct || 0}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase">Correct</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                    <XCircle className="text-red-500 mx-auto mb-2" size={22} />
                    <p className="text-2xl font-bold text-slate-900">{testData.incorrect || 0}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase">Incorrect</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                    <AlertCircle className="text-slate-400 mx-auto mb-2" size={22} />
                    <p className="text-2xl font-bold text-slate-900">{testData.unanswered || 0}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase">Skipped</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                    <Clock className="text-[#2278B0] mx-auto mb-2" size={22} />
                    <p className="text-2xl font-bold text-slate-900">
                        {testData.timeTaken ? formatTime(testData.timeTaken) : '--'}
                    </p>
                    <p className="text-xs text-slate-500 font-bold uppercase">Time</p>
                </div>
            </div>

            {/* Question Review */}
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Brain size={22} className="text-[#2278B0]" />
                Question Review
            </h2>

            {questions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <p className="text-slate-500">Question details are not available for this test.</p>
                </div>
            ) : (
                <div className="space-y-4 mb-12">
                    {questions.map((q, idx) => {
                        const userAnswer = answers[q.id];
                        const isCorrect = userAnswer === q.correctAnswer;
                        const isSkipped = userAnswer === undefined || userAnswer === null;

                        const statusColor = isCorrect
                            ? 'border-green-200 bg-green-50/50'
                            : isSkipped
                                ? 'border-slate-200 bg-slate-50/50'
                                : 'border-red-200 bg-red-50/50';

                        return (
                            <div key={q.id || idx} className={`p-6 rounded-2xl border ${statusColor}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Question {idx + 1}</span>
                                        {q.difficulty && (
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                                q.difficulty.toLowerCase() === 'hard' ? 'bg-red-50 text-red-600 border-red-100' :
                                                q.difficulty.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                'bg-green-50 text-green-600 border-green-100'
                                            }`}>
                                                {q.difficulty}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isCorrect
                                        ? 'bg-green-100 text-green-700'
                                        : isSkipped
                                            ? 'bg-slate-200 text-slate-600'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                        {isCorrect ? '✓ Correct' : isSkipped ? 'Skipped' : '✗ Incorrect'}
                                    </span>
                                </div>
                                <div className="mb-4">
                                    {q.text
                                        .replace(/([a-z.?!])\s+(?=\d{1,2}\.\s)/gi, '$1\n')
                                        .replace(/([a-z.?'")])\s+(?=(Which of the|Which following|Which among|Which one|How many|Select the|Choose the|Identify the)\b)/gi, '$1\n')
                                        .split(/\n|(?=(?:^|\s)\d{1,2}\.\s)/g)
                                        .map((part, i) => {
                                        const trimmed = part.trim();
                                        const isStatement = /^\d{1,2}\./.test(trimmed);

                                        if (!trimmed) return null;

                                        return (
                                            <div key={i} className={`mb-2 ${isStatement ? 'pl-3 text-slate-700 font-medium bg-slate-50/50 p-2 rounded-lg border-l-2 border-slate-300 text-sm' : 'font-medium text-slate-800'}`}>
                                                {trimmed}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="space-y-2">
                                    {q.options?.map((opt, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-3 p-3 rounded-lg text-sm border ${i === q.correctAnswer
                                                ? 'bg-green-100 border-green-200'
                                                : i === userAnswer && !isCorrect
                                                    ? 'bg-red-100 border-red-200'
                                                    : 'bg-white border-slate-100'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === q.correctAnswer
                                                ? 'bg-green-500 text-white'
                                                : i === userAnswer
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-slate-200 text-slate-500'
                                                }`}>
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                            <span className={i === q.correctAnswer ? 'font-bold text-green-900' : 'text-slate-600'}>
                                                {opt}
                                            </span>
                                            {i === q.correctAnswer && (
                                                <CheckCircle size={14} className="text-green-500 ml-auto" />
                                            )}
                                            {i === userAnswer && !isCorrect && (
                                                <XCircle size={14} className="text-red-500 ml-auto" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {q.solution ? (
                                    <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
                                        {q.solution.correct_explanation && (
                                            <div>
                                                <span className="font-bold text-slate-800 text-sm">Explanation:</span>
                                                <p className="text-sm text-slate-600 mt-1">{q.solution.correct_explanation}</p>
                                            </div>
                                        )}
                                        {q.solution.solving_approach && (
                                            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                                <span className="font-bold text-blue-800 text-xs uppercase tracking-wider">💡 Solving Approach:</span>
                                                <p className="text-sm text-blue-700 mt-1">{q.solution.solving_approach}</p>
                                            </div>
                                        )}
                                        {q.solution.possible_source && (
                                            <div className="flex items-start gap-2 text-xs text-slate-500 mt-2">
                                                <BookOpen size={14} className="mt-0.5 shrink-0" />
                                                <span><span className="font-semibold">Source:</span> {q.solution.possible_source}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : q.explanation && (
                                    <div className="mt-4 pt-4 border-t border-slate-200/50">
                                        <p className="text-sm text-slate-600">
                                            <span className="font-bold text-slate-800">Explanation: </span>
                                            {q.explanation}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TestReviewView;
