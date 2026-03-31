import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks';
import {
    CheckCircle, XCircle, AlertCircle, ArrowLeft,
    RefreshCw, Clock, Brain, BookOpen, Lightbulb, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { formatTime } from '../../utils/helpers';
import logger from '../../utils/logger';

// Fix: module-level utilities — not re-created on every render
const formatDate = (ts) => {
    if (!ts) return 'Unknown';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const parseToBullets = (text) => {
    if (!text) return [];
    return text
        .split(/\n/)
        .flatMap(line => line.split(/(?<=\.)\s+(?=[A-Z])/))
        .map(s => s.replace(/^[-•*\d]+[.)]\s*/, '').trim())
        .filter(Boolean);
};


/**
 * TestReviewView Component
 * Displays detailed review of a specific past test with question-by-question breakdown.
 * Reads from testData.results (from submitTest) with 3-layer solution schema.
 */
const TestReviewView = () => {
    const { testId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [collapsedIds, setCollapsedIds] = useState({});
    const [reviewFilter, setReviewFilter] = useState('all');
    const [isDownloading, setIsDownloading] = useState(false);

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

    const toggleCollapse = useCallback((id) =>
        setCollapsedIds(prev => ({ ...prev, [id]: !prev[id] })), []);

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

    // ── Data normalisation ──────────────────────────────────────────────────────
    // NEW shape: testData.results (array from submitTest Cloud Function)
    // OLD shape: testData.questions + testData.answers (legacy)
    const rawResults = testData.results || [];
    const legacyQuestions = testData.questions || [];
    const legacyAnswers = testData.answers || {};

    const reviewItems = rawResults.length > 0
        ? rawResults.map((r, idx) => ({
            id: r.questionId || idx,
            text: r.text || '',
            options: r.options || [],
            userAnswer: r.userAnswer,
            correctAnswer: r.correctAnswer,
            isCorrect: r.isCorrect,
            isSkipped: r.userAnswer === null || r.userAnswer === undefined,
            difficulty: r.difficulty,
            questionType: r.questionType,
            solution: r.solution,
            explanation: r.explanation,
        }))
        : legacyQuestions.map((q, idx) => {
            const userAnswer = q.userAnswer !== undefined ? q.userAnswer : legacyAnswers[q.id];
            const isSkipped = userAnswer === undefined || userAnswer === null;
            const isCorrect = !isSkipped && userAnswer === q.correctAnswer;
            return {
                id: q.id || idx,
                text: q.text || '',
                options: q.options || [],
                userAnswer,
                correctAnswer: q.correctAnswer,
                isCorrect,
                isSkipped,
                difficulty: q.difficulty,
                questionType: q.questionType,
                solution: q.solution,
                explanation: q.explanation,
            };
        });

    const accuracy = testData.accuracy
        ?? (testData.totalQuestions
            ? Math.round(((testData.correct || 0) / testData.totalQuestions) * 100)
            : 0);

    // ── Data normalisation ──────────────────────────────────────────────────────
    const handleExportTest = async () => {
        setIsDownloading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const printContainer = document.createElement('div');
            printContainer.id = 'print-report';

            const correctCount = testData.correct || 0;
            const incorrectCount = testData.incorrect || 0;
            const unansweredCount = testData.unanswered || 0;
            const score = accuracy; // derived

            let questionsHtml = '';
            if (reviewItems && reviewItems.length > 0) {
                questionsHtml = reviewItems.map((q, idx) => {
                    const userAnswer = q.userAnswer;
                    const isCorrect = q.isCorrect;
                    const isSkipped = q.isSkipped;
                    const status = isCorrect ? '✓ Correct' : (isSkipped ? '— Skipped' : '✗ Incorrect');
                    const statusColor = isCorrect ? '#16a34a' : (isSkipped ? '#64748b' : '#dc2626');

                    const optionsHtml = q.options.map((opt, i) => {
                        const marker = String.fromCharCode(65 + i);
                        let style = '';
                        if (i === q.correctAnswer) style = 'color: #16a34a; font-weight: bold;';
                        else if (i === userAnswer) style = 'color: #dc2626;';
                        return `<div style="padding: 4px 0; ${style}">${marker}. ${typeof opt === 'string' ? opt.replace(/^([a-dA-D]|\d+)[.)]\s*/, '').trim() : opt}</div>`;
                    }).join('');

                    return `
                        <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong style="color: #64748b; font-size: 12px;">Q${idx + 1}</strong>
                                <span style="color: ${statusColor}; font-size: 12px; font-weight: bold;">${status}</span>
                            </div>
                            <div style="margin: 0 0 8px 0; font-weight: 500;">
                                ${q.text
                                    .replace(/([a-z.?!])\s+(?=(?:\d{1,2}|[A-Da-d])\.\s)/gi, '$1\n')
                                    .replace(/([a-z.?'")])\s+(?=(Which of the|Which following|Which among|Which one|How many|Select the|Choose the|Identify the)\b)/gi, '$1\n')
                                    .split(/\n|(?=(?:^|\s)(?:\d{1,2}|[A-Da-d])\.\s)/g)
                                    .map(part => {
                                        const trimmed = part.trim();
                                        const isStatement = /^(?:\d{1,2}|[A-Da-d])\./.test(trimmed);
                                        if (!trimmed) return '';
                                        return `<div style="margin-bottom: 4px; ${isStatement ? 'padding-left: 12px; border-left: 2px solid #cbd5e1; background: #f8fafc; padding-top: 4px; padding-bottom: 4px;' : ''}">${trimmed}</div>`;
                                    }).join('')}
                            </div>
                            ${optionsHtml}
                            ${q.solution ? `
                                <div style="margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                                    ${(q.solution.correctAnswerReason || q.solution.correct_explanation) ? `<p style="margin: 0 0 4px 0; color: #334155; font-size: 13px;"><strong>✅ Answer:</strong> ${q.solution.correctAnswerReason || q.solution.correct_explanation}</p>` : ''}
                                    ${(q.solution.approachToSolve || q.solution.solving_approach) ? `<p style="margin: 4px 0; padding: 6px; background: #eff6ff; border-radius: 4px; color: #1e40af; font-size: 12px;"><strong>💡 Approach:</strong> ${q.solution.approachToSolve || q.solution.solving_approach}</p>` : ''}
                                    ${(q.solution.sourceOfQuestion || q.solution.possible_source) ? `<p style="margin: 4px 0 0 0; color: #64748b; font-size: 11px;"><strong>📖 Source:</strong> ${q.solution.sourceOfQuestion || q.solution.possible_source}</p>` : ''}
                                </div>
                            ` : q.explanation ? `<p style="margin-top: 8px; color: #64748b; font-size: 13px; border-top: 1px solid #f1f5f9; padding-top: 8px;"><strong>Explanation:</strong> ${q.explanation}</p>` : ''}
                        </div>
                    `;
                }).join('');
            }

            printContainer.innerHTML = `
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="margin: 0; color: #1e1b4b; font-size: 24px;">Test Performance Report</h1>
                    <p style="color: #64748b; margin: 4px 0;">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div style="display: flex; justify-content: space-around; margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 12px;">
                    <div style="text-align: center;"><strong style="font-size: 28px; color: #1e1b4b;">${score}%</strong><br/><span style="color: #64748b; font-size: 12px;">Score</span></div>
                    <div style="text-align: center;"><strong style="font-size: 28px; color: #16a34a;">${correctCount}</strong><br/><span style="color: #64748b; font-size: 12px;">Correct</span></div>
                    <div style="text-align: center;"><strong style="font-size: 28px; color: #dc2626;">${incorrectCount}</strong><br/><span style="color: #64748b; font-size: 12px;">Incorrect</span></div>
                    <div style="text-align: center;"><strong style="font-size: 28px; color: #64748b;">${unansweredCount}</strong><br/><span style="color: #64748b; font-size: 12px;">Skipped</span></div>
                </div>
                <h2 style="color: #1e1b4b; margin-bottom: 12px;">Question Review</h2>
                ${questionsHtml}
            `;

            printContainer.style.padding = '20px';
            printContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';

            const opt = {
                margin: 0.5,
                filename: `Test_Report_${testData.topic?.replace(/\s+/g, '_') || 'Review'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(printContainer).save();
            logger.info('PDF report downloaded from Review');
        } catch (err) {
            logger.error('Failed to export PDF', err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20">

            {/* Top Bar with Back & Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <button
                    onClick={() => navigate('/test-history')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors w-max"
                >
                    <ArrowLeft size={16} /> Back to Test History
                </button>

                <button
                    onClick={handleExportTest}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm shadow-sm rounded-xl hover:bg-slate-50 hover:text-[#2278B0] hover:border-slate-300 transition-all w-max active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
                    title="Export Test as PDF"
                >
                    {isDownloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                    {isDownloading ? 'Generating PDF...' : 'Download PDF Report'}
                </button>
            </div>

            {/* Header */}
            <div className="bg-indigo-950 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#2278B0]/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">Test Review</p>
                        <h1 className="text-2xl font-black mb-1">
                            {testData.topic || testData.testName || 'Practice Test'}
                        </h1>
                        <p className="text-blue-200 text-sm">{formatDate(testData.completedAt)}</p>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="text-5xl font-black">{accuracy}%</p>
                        <p className={`text-xs font-bold mt-1 px-3 py-1 rounded-full inline-block ${accuracy >= 50 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {accuracy >= 50 ? 'Passed' : 'Needs Improvement'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { icon: <CheckCircle className="text-green-500 mx-auto mb-2" size={22} />, val: testData.correct ?? reviewItems.filter(r => r.isCorrect).length, label: 'Correct' },
                    { icon: <XCircle className="text-red-500 mx-auto mb-2" size={22} />, val: testData.incorrect ?? reviewItems.filter(r => !r.isCorrect && !r.isSkipped).length, label: 'Incorrect' },
                    { icon: <AlertCircle className="text-slate-400 mx-auto mb-2" size={22} />, val: testData.unanswered ?? reviewItems.filter(r => r.isSkipped).length, label: 'Skipped' },
                    { icon: <Clock className="text-[#2278B0] mx-auto mb-2" size={22} />, val: testData.timeTaken ? formatTime(testData.timeTaken) : '--', label: 'Time' },
                ].map(({ icon, val, label }) => (
                    <div key={label} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                        {icon}
                        <p className="text-2xl font-bold text-slate-900">{val}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase">{label}</p>
                    </div>
                ))}
            </div>

            {/* Question Review */}
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Brain size={22} className="text-[#2278B0]" /> Question Review
            </h2>

            {reviewItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <p className="text-slate-500">Question details are not available for this test.</p>
                </div>
            ) : (
                <div className="space-y-4 mb-12">
                    {/* Filter Nav */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        <button onClick={() => setReviewFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reviewFilter === 'all' ? 'bg-[#2278B0] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>All Questions</button>
                        <button onClick={() => setReviewFilter('correct')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${reviewFilter === 'correct' ? 'bg-green-100 text-green-700 ring-2 ring-green-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><CheckCircle size={14} /> Correct</button>
                        <button onClick={() => setReviewFilter('incorrect')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${reviewFilter === 'incorrect' ? 'bg-red-100 text-red-700 ring-2 ring-red-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><XCircle size={14} /> Incorrect</button>
                        <button onClick={() => setReviewFilter('skipped')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${reviewFilter === 'skipped' ? 'bg-slate-200 text-slate-700 ring-2 ring-slate-400/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><AlertCircle size={14} /> Skipped</button>
                    </div>
                    {reviewItems.filter(q => {
                        if (reviewFilter === 'correct') return q.isCorrect;
                        if (reviewFilter === 'incorrect') return !q.isCorrect && !q.isSkipped;
                        if (reviewFilter === 'skipped') return q.isSkipped;
                        return true;
                    }).length === 0 ? (
                        <div className="bg-slate-50/80 border-2 border-slate-200/50 border-dashed rounded-3xl p-12 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                                {reviewFilter === 'correct' ? <CheckCircle size={28} className="text-slate-300" /> :
                                 reviewFilter === 'incorrect' ? <XCircle size={28} className="text-slate-300" /> :
                                 <AlertCircle size={28} className="text-slate-300" />}
                            </div>
                            <h3 className="text-xl font-black text-slate-700 mb-2">
                                {reviewFilter === 'correct' ? 'No Correct Answers' :
                                 reviewFilter === 'incorrect' ? 'No Incorrect Answers' :
                                 reviewFilter === 'skipped' ? 'No Skipped Questions' :
                                 'No Questions Found'}
                            </h3>
                            <p className="text-sm font-medium text-slate-500">
                                {reviewFilter === 'correct' ? "You didn't get any questions right in this test." :
                                 reviewFilter === 'incorrect' ? "Great job! You didn't get any questions wrong." :
                                 reviewFilter === 'skipped' ? "Awesome! You attempted every single question." :
                                 "There are no questions to review right now."}
                            </p>
                        </div>
                    ) : (
                        reviewItems.map((q, idx) => {
                            if (reviewFilter === 'correct' && !q.isCorrect) return null;
                            if (reviewFilter === 'incorrect' && (q.isCorrect || q.isSkipped)) return null;
                            if (reviewFilter === 'skipped' && !q.isSkipped) return null;

                        const isCollapsed = collapsedIds[q.id];

                        const borderStyle = q.isCorrect
                            ? 'border-green-200'
                            : q.isSkipped ? 'border-slate-200' : 'border-red-200';

                        // Resolve solution fields — support both the 3-layer schema and old field names
                        const sol = q.solution || {};
                        const correctReason    = sol.correctAnswerReason || sol.correct_explanation || q.explanation || '';
                        const approachToSolve  = sol.approachToSolve    || sol.solving_approach    || '';
                        const sourceRef        = sol.sourceOfQuestion    || sol.possible_source     || '';

                        const correctOptionLabel  = q.options?.[q.correctAnswer];
                        const userOptionLabel     = (!q.isCorrect && !q.isSkipped && q.userAnswer !== undefined && q.userAnswer !== null)
                            ? q.options?.[q.userAnswer]
                            : null;

                        const hasSolution = correctReason || approachToSolve || sourceRef;

                        return (
                            <div key={q.id} className={`rounded-2xl border ${borderStyle} overflow-hidden shadow-sm`}>

                                {/* ── Question Card Top ── */}
                                <div className="p-5 bg-white">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Q{idx + 1}</span>
                                            {q.difficulty && (
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                                    /hard/i.test(q.difficulty)         ? 'bg-red-50 text-red-600 border-red-100' :
                                                    /inter|medium/i.test(q.difficulty) ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                                         'bg-green-50 text-green-600 border-green-100'
                                                }`}>{q.difficulty}</span>
                                            )}
                                            {q.questionType && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-slate-50 text-slate-500 border-slate-200 uppercase">
                                                    {q.questionType}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                                q.isCorrect  ? 'bg-green-100 text-green-700'  :
                                                q.isSkipped  ? 'bg-slate-200 text-slate-600'  :
                                                               'bg-red-100 text-red-700'
                                            }`}>
                                                {q.isCorrect ? '✓ Correct' : q.isSkipped ? 'Skipped' : '✗ Incorrect'}
                                            </span>
                                            {hasSolution && (
                                                <button
                                                    onClick={() => toggleCollapse(q.id)}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                                                    title={isCollapsed ? 'Show explanation' : 'Hide explanation'}
                                                >
                                                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Question text */}
                                    <div className="mb-4">
                                        {(() => {
                                            const parts = q.text
                                                .replace(/([a-z.?!])\s+(?=(?:\d{1,2}|[A-Fa-f])\.\s)/gi, '$1\n')
                                                .replace(/([a-z.?'"])\s+(?=(Which of the|Which following|Which among|Which one|How many|Select the|Choose the|Identify the)\b)/gi, '$1\n')
                                                .split(/\n/g)
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
                                                const isStatement = /^(?:\d{1,2}|[A-Fa-f])\./.test(p);
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
                                                                            <div key={idx} className="pl-3 text-slate-700 font-medium bg-white p-2 sm:p-3 rounded-md border-l-2 border-slate-300 text-sm flex gap-2 items-start h-full shadow-sm">
                                                                                <span className="shrink-0 font-bold text-slate-500">{stmt.match(/^(?:\d{1,2}|[A-Fa-f])\./)[0]}</span>
                                                                                <span className="flex-1">{stmt.replace(/^(?:\d{1,2}|[A-Fa-f])\.\s*/, '')}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-800 mb-2 ml-1">{rawChunks[i + 2].content}</div>
                                                                    <div className="flex flex-col gap-2">
                                                                        {rawChunks[i + 3].items.map((stmt, idx) => (
                                                                            <div key={idx} className="pl-3 text-slate-700 font-medium bg-white p-2 sm:p-3 rounded-md border-l-2 border-slate-300 text-sm flex gap-2 items-start h-full shadow-sm">
                                                                                <span className="shrink-0 font-bold text-slate-500">{stmt.match(/^(?:\d{1,2}|[A-Fa-f])\./)[0]}</span>
                                                                                <span className="flex-1">{stmt.replace(/^(?:\d{1,2}|[A-Fa-f])\.\s*/, '')}</span>
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
                                                                <div key={idx} className="pl-3 text-slate-700 font-medium bg-slate-50 p-2 sm:p-3 rounded-lg border-l-2 border-slate-300 text-sm flex gap-2 items-start h-full">
                                                                    <span className="shrink-0 font-bold text-slate-500">{stmt.match(/^(?:\d{1,2}|[A-Fa-f])\./)[0]}</span>
                                                                    <span className="flex-1">{stmt.replace(/^(?:\d{1,2}|[A-Fa-f])\.\s*/, '')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                } else {
                                                    blocks.push(
                                                        <div key={`p-${i}`} className="mb-2 font-semibold text-slate-800">
                                                            {chunk.content}
                                                        </div>
                                                    );
                                                }
                                            }
                                            return blocks;
                                        })()}
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-2">
                                        {q.options.map((opt, i) => (
                                            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm border ${
                                                i === q.correctAnswer                       ? 'bg-green-100 border-green-200' :
                                                i === q.userAnswer && !q.isCorrect          ? 'bg-red-100 border-red-200'   :
                                                                                              'bg-slate-50 border-slate-100'
                                            }`}>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                    i === q.correctAnswer           ? 'bg-green-500 text-white' :
                                                    i === q.userAnswer              ? 'bg-red-500 text-white'   :
                                                                                      'bg-slate-200 text-slate-500'
                                                }`}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                                <span className={i === q.correctAnswer ? 'font-bold text-green-900' : 'text-slate-600'}>
                                                    {opt}
                                                </span>
                                                {i === q.correctAnswer && <CheckCircle size={14} className="text-green-500 ml-auto shrink-0" />}
                                                {i === q.userAnswer && !q.isCorrect && <XCircle size={14} className="text-red-500 ml-auto shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Explanation Panel (visible by default, collapsible) ── */}
                                {!isCollapsed && hasSolution && (
                                    <div className="border-t border-slate-100 bg-slate-50/60 p-5 space-y-3">

                                        {/* 1. How to Approach */}
                                        {approachToSolve && (
                                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-2.5">
                                                    <Lightbulb size={14} className="text-blue-600 shrink-0" />
                                                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                                                        How to Approach this Question
                                                    </span>
                                                </div>
                                                <ul className="space-y-2">
                                                    {parseToBullets(approachToSolve).map((bullet, i) => (
                                                        <li key={i} className="flex items-start gap-2.5 text-sm text-blue-800">
                                                            <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                                            <span>{bullet}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* 2. Why Correct Answer is Correct */}
                                        {correctReason && (
                                            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-2.5">
                                                    <CheckCircle size={14} className="text-green-600 shrink-0" />
                                                    <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider">
                                                        Explanation — Why &ldquo;{correctOptionLabel}&rdquo; is Correct
                                                    </span>
                                                </div>
                                                <ul className="space-y-2">
                                                    {parseToBullets(correctReason).map((bullet, i) => (
                                                        <li key={i} className="flex items-start gap-2.5 text-sm text-green-800">
                                                            <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                                            <span>{bullet}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* 3. Why the User's Answer Was Wrong (only on incorrect answers) */}
                                        {userOptionLabel && (
                                            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-2.5">
                                                    <XCircle size={14} className="text-red-500 shrink-0" />
                                                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                                                        Why Your Answer &ldquo;{userOptionLabel}&rdquo; is Incorrect
                                                    </span>
                                                </div>
                                                <ul className="space-y-2">
                                                    <li className="flex items-start gap-2.5 text-sm text-red-800">
                                                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                                        <span>
                                                            The correct answer is <strong>&ldquo;{correctOptionLabel}&rdquo;</strong>.{' '}
                                                            {parseToBullets(correctReason)[0] || ''}
                                                        </span>
                                                    </li>
                                                    {parseToBullets(approachToSolve).slice(0, 2).map((bullet, i) => (
                                                        <li key={i} className="flex items-start gap-2.5 text-sm text-red-700">
                                                            <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-red-300 shrink-0" />
                                                            <span>{bullet}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* 4. Source Reference */}
                                        {sourceRef && (
                                            <div className="flex items-start gap-2 text-xs text-slate-500 pt-1 pl-1">
                                                <BookOpen size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                                <span>
                                                    <span className="font-semibold text-slate-600">Source: </span>
                                                    {sourceRef}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }))}
                </div>
            )}
        </div>
    );
};

export default TestReviewView;
