import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    CheckCircle, XCircle, AlertCircle, Clock, ArrowLeft,
    Brain, Target, ListChecks, ArrowRight, RefreshCw, ChevronDown, Download, BarChart2, BookOpen, Activity,
    Lightbulb
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { analyzeTestPerformance } from '../../services/geminiService';
import { formatTime } from '../../utils/helpers';
import logger from '../../utils/logger';
import { toast } from '../../utils/toast';

const ResultView = ({ test, answers, results, exitTest }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(true);
    const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'insights' | 'review'
    const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'skipped'

    useEffect(() => {
        let cancelled = false;

        const runAnalysis = async () => {
            if (test && answers) {
                try {
                    const aiResult = await analyzeTestPerformance(test, answers);
                    if (!cancelled) {
                        setAnalysis(aiResult);
                        setLoadingAnalysis(false);
                    }
                } catch (error) {
                    if (!cancelled) {
                        logger.error('AI analysis failed:', error);
                        setLoadingAnalysis(false);
                    }
                }
            }
        };
        runAnalysis();

        return () => { cancelled = true; };
    }, [test, answers]);

    // PDF Export via html2pdf.js
    const [isDownloading, setIsDownloading] = useState(false);

    const exportToPDF = useCallback(async () => {
        setIsDownloading(true);
        // Create the print container
        const printContainer = document.createElement('div');
        printContainer.id = 'print-report';

        const correctCount = results.correct || 0;
        const incorrectCount = results.incorrect || 0;
        const unansweredCount = results.unanswered || 0;

        let questionsHtml = '';
        if (test && test.length > 0) {
            questionsHtml = test.map((q, idx) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer === q.correctAnswer;
                const isSkipped = userAnswer === undefined;
                const status = isCorrect ? '✓ Correct' : (isSkipped ? '— Skipped' : '✗ Incorrect');
                const statusColor = isCorrect ? '#16a34a' : (isSkipped ? '#64748b' : '#dc2626');

                const optionsHtml = q.options.map((opt, i) => {
                    const marker = String.fromCharCode(65 + i);
                    let style = '';
                    if (i === q.correctAnswer) style = 'color: #16a34a; font-weight: bold;';
                    else if (i === userAnswer) style = 'color: #dc2626;';
                    return `<div style="padding: 4px 0; ${style}">${marker}. ${opt}</div>`;
                }).join('');

                return `
                    <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <strong style="color: #64748b; font-size: 12px;">Q${idx + 1}</strong>
                            <span style="color: ${statusColor}; font-size: 12px; font-weight: bold;">${status}</span>
                        </div>
                        <div style="margin: 0 0 8px 0; font-weight: 500;">
                            ${q.text
                        .replace(/([a-z.?!])\\s+(?=(?:\\d{1,2}|[A-Da-d])\\.\\s)/gi, '$1\\n')
                        .replace(/([a-z.?'")])\\s+(?=(Which of the|Which following|Which among|Which one|How many|Select the|Choose the|Identify the)\\b)/gi, '$1\\n')
                        .split(/\\n|(?=(?:^|\\s)(?:\\d{1,2}|[A-Da-d])\\.\\s)/g)
                        .map(part => {
                            const trimmed = part.trim();
                            const isStatement = /^(?:\\d{1,2}|[A-Da-d])\\./.test(trimmed);
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
                <div style="text-align: center;"><strong style="font-size: 28px; color: #1e1b4b;">${results.score}%</strong><br/><span style="color: #64748b; font-size: 12px;">Score</span></div>
                <div style="text-align: center;"><strong style="font-size: 28px; color: #16a34a;">${correctCount}</strong><br/><span style="color: #64748b; font-size: 12px;">Correct</span></div>
                <div style="text-align: center;"><strong style="font-size: 28px; color: #dc2626;">${incorrectCount}</strong><br/><span style="color: #64748b; font-size: 12px;">Incorrect</span></div>
                <div style="text-align: center;"><strong style="font-size: 28px; color: #64748b;">${unansweredCount}</strong><br/><span style="color: #64748b; font-size: 12px;">Skipped</span></div>
                <div style="text-align: center;"><strong style="font-size: 28px; color: #2278B0;">${formatTime(results.timeTaken)}</strong><br/><span style="color: #64748b; font-size: 12px;">Time</span></div>
            </div>
            ${analysis ? `
                <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h3 style="color: #1e1b4b; margin: 0 0 8px 0;">AI Insights</h3>
                    <p style="color: #475569; line-height: 1.6; margin-bottom: 16px;">${analysis.overallFeedback}</p>

                    <div style="display: flex; gap: 16px;">
                        <div style="flex: 1; padding: 12px; background: #fff7ed; border-radius: 8px;">
                            <h4 style="color: #c2410c; margin: 0 0 8px 0; font-size: 14px;">Topics to Study</h4>
                            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
                                ${(analysis.focusOn || analysis.focusChecklist || []).map(i => `<li style="margin-bottom: 4px;">${i}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="flex: 1; padding: 12px; background: #f8fafc; border-radius: 8px;">
                            <h4 style="color: #64748b; margin: 0 0 8px 0; font-size: 14px;">Not Focus On</h4>
                            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #64748b;">
                                ${(analysis.notFocusOn || []).map(i => `<li style="margin-bottom: 4px;">${i}</li>`).join('')}
                                ${(!analysis.notFocusOn || analysis.notFocusOn.length === 0) ? '<li style="list-style: none; font-style: italic;">None</li>' : ''}
                            </ul>
                        </div>
                        <div style="flex: 1; padding: 12px; background: #f0fdf4; border-radius: 8px;">
                            <h4 style="color: #15803d; margin: 0 0 8px 0; font-size: 14px;">Key Strengths</h4>
                            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
                                ${(analysis.strengths || []).map(i => `<li style="margin-bottom: 4px;">${i}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            ` : ''}
            <h2 style="color: #1e1b4b; margin-bottom: 12px;">Question Review</h2>
            ${questionsHtml}
        `;

        // Add styling for PDF
        printContainer.style.padding = '20px';
        printContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';

        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const opt = {
                margin: 0.5,
                filename: `Test_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(printContainer).save();
            logger.info('PDF report downloaded');
        } catch (error) {
            logger.error('PDF generation error', error);
            toast.error('Failed to generate PDF. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    }, [test, answers, results, analysis]);

    if (!results) return null;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Termination Alert */}
            {results.status === 'terminated' && (
                <div className="bg-red-600 text-white p-4 text-center animate-in slide-in-from-top">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                        <AlertCircle size={24} className="animate-pulse" />
                        <div>
                            <span className="font-bold text-lg block">Test Terminated</span>
                            <span className="text-red-100 text-sm">{results.terminationReason || 'Proctoring violations detected.'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Score Card */}
            <div className="bg-indigo-950 text-white p-6 sm:p-8 pb-12 sm:pb-16 relative overflow-hidden">
                <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-20">
                    <button
                        onClick={exitTest}
                        className="flex items-center gap-2 text-indigo-200 hover:text-white transition-colors text-sm font-bold bg-indigo-900/50 hover:bg-indigo-800/80 px-3 py-1.5 rounded-lg"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                </div>
                <div className="relative z-10 max-w-7xl mx-auto text-center">
                    <h1 className="text-xl font-medium text-blue-200 uppercase tracking-widest mb-4">Test Complete</h1>
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-6xl font-black mb-2 animate-in zoom-in duration-500">
                            {results.score}%
                        </div>
                        <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase ${results.score >= 50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {results.score >= 50 ? 'Passed' : 'Needs Improvement'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                        <CheckCircle className="text-green-500 mb-2" size={24} />
                        <span className="text-2xl font-bold text-slate-800">{results.correct}</span>
                        <span className="text-xs text-slate-500 uppercase font-bold">Correct</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                        <XCircle className="text-red-500 mb-2" size={24} />
                        <span className="text-2xl font-bold text-slate-800">{results.incorrect}</span>
                        <span className="text-xs text-slate-500 uppercase font-bold">Incorrect</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                        <AlertCircle className="text-slate-400 mb-2" size={24} />
                        <span className="text-2xl font-bold text-slate-800">{results.unanswered}</span>
                        <span className="text-xs text-slate-500 uppercase font-bold">Skipped</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                        <Clock className="text-[#2278B0] mb-2" size={24} />
                        <span className="text-2xl font-bold text-slate-800">{formatTime(results.timeTaken)}</span>
                        <span className="text-xs text-slate-500 uppercase font-bold">Time Taken</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'stats' ? 'text-[#2278B0] border-b-2 border-[#2278B0]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <BarChart2 size={16} /> Detailed Stats
                    </button>
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'insights' ? 'text-[#2278B0] border-b-2 border-[#2278B0]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Brain size={16} /> AI Insights
                    </button>
                    <button
                        onClick={() => setActiveTab('review')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'review' ? 'text-[#2278B0] border-b-2 border-[#2278B0]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <ListChecks size={16} /> Question Review
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'stats' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5">
                        {/* Accuracy Breakdown */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Target size={18} className="text-[#2278B0]" /> Accuracy Breakdown
                            </h3>
                            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-3">
                                <div style={{ width: `${(results.correct / results.totalQuestions) * 100 || 0}%` }} className="bg-green-500 transition-all duration-1000" title="Correct"></div>
                                <div style={{ width: `${(results.incorrect / results.totalQuestions) * 100 || 0}%` }} className="bg-red-500 transition-all duration-1000" title="Incorrect"></div>
                                <div style={{ width: `${(results.unanswered / results.totalQuestions) * 100 || 0}%` }} className="bg-slate-300 transition-all duration-1000" title="Skipped"></div>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs sm:text-sm font-medium mt-1">
                                <div className="flex items-center gap-1.5 text-green-700">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0"></div>
                                    <span>{results.correct} Correct ({((results.correct / results.totalQuestions) * 100 || 0).toFixed(0)}%)</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-red-700">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></div>
                                    <span>{results.incorrect} Incorrect ({((results.incorrect / results.totalQuestions) * 100 || 0).toFixed(0)}%)</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-600">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></div>
                                    <span>{results.unanswered} Skipped ({((results.unanswered / results.totalQuestions) * 100 || 0).toFixed(0)}%)</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Question Type Performance Graph */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
                                    <BarChart2 size={18} className="text-indigo-600" /> Question Format Analysis
                                </h3>
                                <div className="h-[260px] w-full relative z-10">
                                    {(() => {
                                        let typeStats = {};

                                        (test || []).forEach(q => {
                                            let type = q.questionType;
                                            // Fallback inference if type is missing or generic
                                            if (!type || type.toLowerCase() === 'mcq') {
                                                if (/Assertion.*Reason/i.test(q.text) || /Assertion\s*\(A\).*Reason\s*\(R\)/i.test(q.text)) {
                                                    type = 'Assertion-Reason';
                                                } else if (/Match.*List I.*List II/i.test(q.text) || /Match the following/i.test(q.text)) {
                                                    type = 'Match the Following';
                                                } else if (/(Consider the following statements|Which of the statements)/i.test(q.text) || /\b1\.\s.*\b2\.\s/i.test(q.text)) {
                                                    type = 'Statement Based';
                                                } else if (q.options?.some(opt => /both/i.test(opt) || /neither/i.test(opt) || /only (1|2|3|one)/i.test(opt))) {
                                                    type = 'Multi-Statement';
                                                } else {
                                                    type = 'Direct MCQ';
                                                }
                                            }

                                            // Humanize names
                                            if (/match/i.test(type)) type = 'Matching';
                                            if (/assertion/i.test(type)) type = 'Assertion';
                                            if (/statement/i.test(type)) type = 'Statements';
                                            if (/one[\s-]?liner/i.test(type)) type = 'One-Liner';

                                            if (!typeStats[type]) {
                                                typeStats[type] = { total: 0, correct: 0, incorrect: 0, skipped: 0 };
                                            }

                                            const userAnswer = answers[q.id];
                                            typeStats[type].total++;

                                            if (userAnswer === undefined || userAnswer === null) {
                                                typeStats[type].skipped++;
                                            } else if (userAnswer === q.correctAnswer) {
                                                typeStats[type].correct++;
                                            } else {
                                                typeStats[type].incorrect++;
                                            }
                                        });

                                        const barData = Object.entries(typeStats)
                                            .map(([name, stats]) => ({
                                                name,
                                                ...stats,
                                                acc: Math.round((stats.correct / stats.total) * 100)
                                            }))
                                            .sort((a, b) => b.total - a.total); // Sort by highest frequency

                                        if (barData.length === 0) return (
                                            <div className="flex items-center justify-center h-full text-slate-400 font-medium">No question format data available</div>
                                        );

                                        const CustomTooltip = ({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl min-w-[140px]">
                                                        <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
                                                        <div className="space-y-1 text-sm">
                                                            <div className="flex justify-between gap-4"><span className="text-green-600 font-medium">Correct</span><span className="font-bold">{data.correct}</span></div>
                                                            <div className="flex justify-between gap-4"><span className="text-red-500 font-medium">Incorrect</span><span className="font-bold">{data.incorrect}</span></div>
                                                            <div className="flex justify-between gap-4"><span className="text-slate-400 font-medium">Skipped</span><span className="font-bold">{data.skipped}</span></div>
                                                        </div>
                                                        <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium text-center">
                                                            Accuracy: <span className="font-bold text-slate-700">{data.acc}%</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        };

                                        return (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2} barCategoryGap="30%">
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis 
                                                        dataKey="name" 
                                                        axisLine={false} 
                                                        tickLine={false} 
                                                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} 
                                                        dy={10}
                                                    />
                                                    <YAxis 
                                                        type="number" 
                                                        axisLine={false} 
                                                        tickLine={false} 
                                                        tick={{ fill: '#64748b', fontSize: 12 }} 
                                                        allowDecimals={false}
                                                    />
                                                    <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                                                    <Bar dataKey="correct" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={12} />
                                                    <Bar dataKey="incorrect" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={12} />
                                                    {barData.some(d => d.skipped > 0) && (
                                                        <Bar dataKey="skipped" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={12} />
                                                    )}
                                                </BarChart>
                                            </ResponsiveContainer>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Time Analytics */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Clock size={18} className="text-blue-500" /> Time Management
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-500 font-medium">Average Time per Question</span>
                                            <span className="font-bold text-slate-700">{Math.round(results.timeTaken / (results.totalQuestions || 1))} sec</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${(results.timeTaken / (results.totalQuestions || 1)) > 60 ? 'bg-orange-500' : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${Math.min(((results.timeTaken / (results.totalQuestions || 1)) / 60) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="text-xs text-slate-400 uppercase font-bold mb-1">Total Time Used</div>
                                            <div className="text-lg font-black text-slate-800">{formatTime(results.timeTaken)}</div>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="text-xs text-slate-400 uppercase font-bold mb-1">Total Questions</div>
                                            <div className="text-lg font-black text-slate-800">{results.totalQuestions} Qs</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'insights' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5">
                        {loadingAnalysis ? (
                            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center">
                                <div className="w-12 h-12 border-4 border-[#2278B0] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 mb-1">Analyzing Your Performance...</h3>
                                <p className="text-slate-400 text-sm">Reading your answers and finding patterns in your mistakes.</p>
                            </div>
                        ) : analysis ? (
                            <>
                                {/* Overall Feedback */}
                                <div className="bg-gradient-to-br from-indigo-50 to-[#2278B0]/5 p-6 rounded-2xl border border-[#2278B0]/20">
                                    <h3 className="font-bold text-indigo-950 flex items-center gap-2 mb-3">
                                        <Brain className="text-[#2278B0]" size={20} /> Mentor's Feedback
                                    </h3>
                                    <p className="text-slate-700 leading-relaxed text-base">
                                        {analysis.overallFeedback}
                                    </p>
                                </div>

                                {/* Personalized Concept Feedback */}
                                {analysis.personalizedFeedback?.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-sm uppercase tracking-wider">
                                            <AlertCircle size={16} className="text-red-400" /> Where You Struggled — and Why
                                        </h3>
                                        <div className="space-y-3">
                                            {analysis.personalizedFeedback.map((item, i) => (
                                                <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-4">
                                                    <p className="font-bold text-red-700 text-sm mb-1">{item.concept}</p>
                                                    <p className="text-sm text-red-800 leading-relaxed">{item.detail}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Topics to Study */}
                                    {analysis.topicsToStudy?.length > 0 && (
                                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                                            <h4 className="font-bold text-orange-700 flex items-center gap-2 mb-4 uppercase text-xs tracking-wider">
                                                <Target size={15} /> Priority Topics to Study
                                            </h4>
                                            <ul className="space-y-3">
                                                {analysis.topicsToStudy.map((item, i) => {
                                                    const topic = typeof item === 'string' ? item : item.topic;
                                                    const reason = typeof item === 'string' ? '' : item.reason;
                                                    return (
                                                        <li key={i} className="flex items-start gap-2.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-[7px] shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-800">{topic}</p>
                                                                {reason && <p className="text-xs text-slate-500 mt-0.5">{reason}</p>}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Key Strengths */}
                                    {analysis.keyStrengths?.length > 0 && (
                                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                            <h4 className="font-bold text-green-700 flex items-center gap-2 mb-4 uppercase text-xs tracking-wider">
                                                <CheckCircle size={15} /> Key Strengths
                                            </h4>
                                            <ul className="space-y-3">
                                                {analysis.keyStrengths.map((str, i) => (
                                                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                        <CheckCircle size={15} className="text-green-500 mt-0.5 shrink-0" />
                                                        {str}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
                                <p className="text-slate-500">Could not generate insights. Please check the Question Review tab for a detailed breakdown.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'review' && (
                    <div className="space-y-4 animate-in fade-in">
                        {/* Filter Nav */}
                        <div className="flex gap-2 mb-6 flex-wrap">
                            <button onClick={() => setReviewFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reviewFilter === 'all' ? 'bg-[#2278B0] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>All Questions</button>
                            <button onClick={() => setReviewFilter('correct')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${reviewFilter === 'correct' ? 'bg-green-100 text-green-700 ring-2 ring-green-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><CheckCircle size={14} /> Correct</button>
                            <button onClick={() => setReviewFilter('incorrect')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${reviewFilter === 'incorrect' ? 'bg-red-100 text-red-700 ring-2 ring-red-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><XCircle size={14} /> Incorrect</button>
                            <button onClick={() => setReviewFilter('skipped')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${reviewFilter === 'skipped' ? 'bg-slate-200 text-slate-700 ring-2 ring-slate-400/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><AlertCircle size={14} /> Skipped</button>
                        </div>
                        {test.map((q, idx) => {
                            const userAnswer = answers[q.id];
                            const isCorrect = userAnswer === q.correctAnswer;
                            const isSkipped = userAnswer === undefined || userAnswer === null;

                            if (reviewFilter === 'correct' && !isCorrect) return null;
                            if (reviewFilter === 'incorrect' && (isCorrect || isSkipped)) return null;
                            if (reviewFilter === 'skipped' && !isSkipped) return null;

                            const borderStyle = isCorrect ? 'border-green-200' : isSkipped ? 'border-slate-200' : 'border-red-200';

                            // Resolve solution fields — supports both 3-layer schema and legacy names
                            const sol = q.solution || {};
                            const correctReason   = sol.correctAnswerReason || sol.correct_explanation || q.explanation || '';
                            const approachToSolve = sol.approachToSolve    || sol.solving_approach    || '';
                            const sourceRef       = sol.sourceOfQuestion   || sol.possible_source     || '';

                            const correctOptionLabel = q.options?.[q.correctAnswer];
                            return (
                                <div key={q.id} className={`rounded-2xl border ${borderStyle} overflow-hidden shadow-sm`}>

                                    {/* Question top section */}
                                    <div className="p-5 bg-white">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-slate-400 uppercase">Q{idx + 1}</span>
                                                {q.difficulty && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                                        /hard/i.test(q.difficulty) ? 'bg-red-50 text-red-600 border-red-100' :
                                                        /inter|medium/i.test(q.difficulty) ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                        'bg-green-50 text-green-600 border-green-100'
                                                    }`}>{q.difficulty}</span>
                                                )}
                                                {q.questionType && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-indigo-50 text-indigo-600 border-indigo-100">
                                                        {q.questionType}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                                isCorrect ? 'bg-green-100 text-green-700' :
                                                isSkipped ? 'bg-slate-200 text-slate-600' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {isCorrect ? '✓ Correct' : isSkipped ? 'Skipped' : '✗ Incorrect'}
                                            </span>
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
                                            {q.options.map((rawOpt, i) => {
                                                const opt = typeof rawOpt === 'string' ? rawOpt.replace(/^([a-dA-D]|\d+)[.)]\s*/, '').trim() : rawOpt;
                                                return (
                                                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm border ${
                                                        i === q.correctAnswer ? 'bg-green-100 border-green-200' :
                                                        i === userAnswer && !isCorrect ? 'bg-red-100 border-red-200' :
                                                        'bg-slate-50 border-slate-100'
                                                    }`}>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                            i === q.correctAnswer ? 'bg-green-500 text-white' :
                                                            i === userAnswer ? 'bg-red-500 text-white' :
                                                            'bg-slate-200 text-slate-500'
                                                        }`}>
                                                            {String.fromCharCode(65 + i)}
                                                        </div>
                                                        <span className={i === q.correctAnswer ? 'font-bold text-green-900' : 'text-slate-600'}>{opt}</span>
                                                        {i === q.correctAnswer && <CheckCircle size={14} className="text-green-500 ml-auto shrink-0" />}
                                                        {i === userAnswer && !isCorrect && <XCircle size={14} className="text-red-500 ml-auto shrink-0" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Compact Solution Panel — 3 rows only */}
                                    <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4 space-y-2.5">

                                        {/* Row 1: Correct Answer */}
                                        <div className="flex items-start gap-2.5">
                                            <CheckCircle size={14} className="text-green-600 mt-0.5 shrink-0" />
                                            <div className="text-sm leading-snug">
                                                <span className="font-bold text-green-700 mr-1.5">Correct Answer:</span>
                                                <span className="text-slate-700">{correctOptionLabel}</span>
                                                {correctReason && (
                                                    <span className="text-slate-500"> — {correctReason}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2: Source */}
                                        {sourceRef && (
                                            <div className="flex items-start gap-2.5">
                                                <BookOpen size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                                                <div className="text-sm leading-snug">
                                                    <span className="font-bold text-indigo-700 mr-1.5">Source:</span>
                                                    <span className="text-slate-600">{sourceRef}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 3: Key / Approach */}
                                        {approachToSolve && (
                                            <div className="flex items-start gap-2.5">
                                                <Lightbulb size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                                <div className="text-sm leading-snug">
                                                    <span className="font-bold text-amber-700 mr-1.5">Key:</span>
                                                    <span className="text-slate-600">{approachToSolve.replace(/^Key:\s*/i, '')}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-12 flex flex-col sm:flex-row justify-center gap-3">
                    <button
                        onClick={exportToPDF}
                        disabled={isDownloading}
                        className="bg-white text-indigo-950 border-2 border-indigo-950 px-8 py-4 rounded-xl font-bold shadow-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isDownloading ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20} />}
                        {isDownloading ? 'Generating PDF...' : 'Download Report'}
                    </button>
                    <button
                        onClick={exitTest}
                        className="bg-indigo-950 text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:bg-indigo-900 transition-all flex items-center justify-center gap-2"
                    >
                        Back to Dashboard <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResultView;
