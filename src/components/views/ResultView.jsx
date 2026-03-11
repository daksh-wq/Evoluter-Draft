import React, { useEffect, useState, useCallback } from 'react';
import {
    CheckCircle, XCircle, AlertCircle, Clock,
    Brain, Target, ListChecks, ArrowRight, RefreshCw, ChevronDown, Download, BarChart2
} from 'lucide-react';
import { analyzeTestPerformance } from '../../services/geminiService';
import { formatTime } from '../../utils/helpers';
import logger from '../../utils/logger';
import { toast } from '../../utils/toast';

const ResultView = ({ test, answers, results, exitTest }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(true);
    const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'insights' | 'review'

    useEffect(() => {
        let cancelled = false;

        const runAnalysis = async () => {
            if (test && results) {
                // Check if server-side suggestions are already present (from submitTest)
                if (results.suggestions) {
                    const s = results.suggestions;
                    const precomputedAnalysis = {
                        overallFeedback: Array.isArray(s.tips) ? s.tips.join(' ') : (s.tips || "Great effort! Review the focus areas below."),
                        strengths: s.strengths || [], // Use explicit strengths if available
                        focusOn: s.focusOn || [],
                        notFocusOn: s.notFocusOn || [],
                    };
                    setAnalysis(precomputedAnalysis);
                    setLoadingAnalysis(false);
                    return;
                }

                // Fallback: Client-side analysis if server didn't provide it
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
    }, [test, results, answers]);

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
                        <p style="margin: 0 0 8px 0; font-weight: 500;">${q.text}</p>
                        ${optionsHtml}
                        ${q.explanation ? `<p style="margin-top: 8px; color: #64748b; font-size: 13px; border-top: 1px solid #f1f5f9; padding-top: 8px;"><strong>Explanation:</strong> ${q.explanation}</p>` : ''}
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
                    <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
                        <AlertCircle size={24} className="animate-pulse" />
                        <div>
                            <span className="font-bold text-lg block">Test Terminated</span>
                            <span className="text-red-100 text-sm">{results.terminationReason || 'Proctoring violations detected.'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Score Card */}
            <div className="bg-indigo-950 text-white p-8 pb-16 relative overflow-hidden">
                <div className="relative z-10 max-w-4xl mx-auto text-center">
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

            <div className="max-w-4xl mx-auto px-6 -mt-10 relative z-20">
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
                            <div className="flex justify-between text-sm font-medium">
                                <div className="flex items-center gap-2 text-green-700">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    {results.correct} Correct ({((results.correct / results.totalQuestions) * 100 || 0).toFixed(0)}%)
                                </div>
                                <div className="flex items-center gap-2 text-red-700">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    {results.incorrect} Incorrect ({((results.incorrect / results.totalQuestions) * 100 || 0).toFixed(0)}%)
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                                    {results.unanswered} Skipped ({((results.unanswered / results.totalQuestions) * 100 || 0).toFixed(0)}%)
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Scoring Ledger */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <BarChart2 size={18} className="text-purple-600" /> UPSC Scoring Ledger
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-100">
                                        <span className="text-green-800 font-medium">Positive Marks (+2/q)</span>
                                        <span className="font-black text-green-600">+{results.correct * 2}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                                        <span className="text-red-800 font-medium">Negative Marks (-0.66/q)</span>
                                        <span className="font-black text-red-600">-{parseFloat((results.incorrect * 0.66).toFixed(2))}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100 border-t-2 border-t-indigo-200 border-dashed">
                                        <span className="text-indigo-950 font-black">Final Raw Score</span>
                                        <span className="font-black text-indigo-700 text-xl">{results.score} / {results.totalQuestions * 2}</span>
                                    </div>
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
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
                                <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
                                <h3 className="text-lg font-bold text-slate-700">Analyzing Performance...</h3>
                                <p className="text-slate-400 text-sm">Our AI is identifying your logic gaps.</p>
                            </div>
                        ) : (
                            <>
                                {/* Feedback Card */}
                                <div className="bg-gradient-to-br from-indigo-50 to-[#2278B0]/5 p-6 rounded-2xl border border-[#2278B0]/20">
                                    <h3 className="font-bold text-indigo-950 flex items-center gap-2 mb-3">
                                        <Brain className="text-[#2278B0]" size={20} /> Curator's Feedback
                                    </h3>
                                    <p className="text-slate-700 leading-relaxed font-serif text-lg">
                                        {analysis.overallFeedback}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Focus Areas (Priority) - NOW: Topics to Study */}
                                    <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                                        <h4 className="font-bold text-orange-700 flex items-center gap-2 mb-4 uppercase text-xs tracking-wider">
                                            <Target size={16} /> Topics to Study
                                        </h4>
                                        <ul className="space-y-3">
                                            {(analysis.focusOn || analysis.focusChecklist || []).map((item, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Not Focus On (Low Priority) - NEW */}
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <h4 className="font-bold text-slate-500 flex items-center gap-2 mb-4 uppercase text-xs tracking-wider">
                                            <XCircle size={16} /> Not Focus On
                                        </h4>
                                        <ul className="space-y-3">
                                            {(analysis.notFocusOn || []).map((item, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                            {(!analysis.notFocusOn || analysis.notFocusOn.length === 0) && (
                                                <li className="text-xs text-slate-400 italic">No specific topics to ignore.</li>
                                            )}
                                        </ul>
                                    </div>

                                    {/* Strengths */}
                                    <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                        <h4 className="font-bold text-green-700 flex items-center gap-2 mb-4 uppercase text-xs tracking-wider">
                                            <CheckCircle size={16} /> Key Strengths
                                        </h4>
                                        <ul className="space-y-3">
                                            {analysis.strengths.map((str, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                    <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                                                    {str}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'review' && (
                    <div className="space-y-4 animate-in fade-in">
                        {test.map((q, idx) => {
                            const userAnswer = answers[q.id];
                            const isCorrect = userAnswer === q.correctAnswer;
                            const isSkipped = userAnswer === undefined;

                            let statusColor = isCorrect ? 'border-green-200 bg-green-50' : (isSkipped ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50');

                            return (
                                <div key={q.id} className={`p-6 rounded-2xl border ${statusColor}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Question {idx + 1}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${isCorrect ? 'bg-green-100 text-green-700' : (isSkipped ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-700')}`}>
                                            {isCorrect ? 'Correct' : (isSkipped ? 'Skipped' : 'Incorrect')}
                                        </span>
                                    </div>
                                    <p className="font-medium text-slate-800 mb-4">{q.text}</p>
                                    <div className="space-y-2">
                                        {q.options.map((opt, i) => (
                                            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm border ${i === q.correctAnswer ? 'bg-green-100 border-green-200' : (i === userAnswer ? 'bg-red-100 border-red-200' : 'bg-white border-slate-100')
                                                }`}>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === q.correctAnswer ? 'bg-green-500 text-white' : (i === userAnswer ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500')
                                                    }`}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                                <span className={i === q.correctAnswer ? 'font-bold text-green-900' : 'text-slate-600'}>{opt}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-200/50">
                                        <p className="text-sm text-slate-600">
                                            <span className="font-bold text-slate-800">Explanation:</span> {q.explanation}
                                        </p>
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
