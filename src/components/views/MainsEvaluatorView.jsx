import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    History,
    Sparkles,
    RefreshCw,
    Brain,
    XCircle,
    CheckCircle,
    ChevronDown
} from 'lucide-react';
import { db, auth } from '../../services/firebase';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { evaluateAnswer } from '../../services/geminiService';
import { UPSC_SYLLABUS } from '../../constants/syllabusData';
import logger from '../../utils/logger';
import { CustomDropdown } from '../common';

/**
 * MainsEvaluatorView Component
 * AI-powered answer writing evaluation
 */
const MainsEvaluatorView = () => {
    const [user] = useAuthState(auth);
    const [recentEvals, setRecentEvals] = useState([]);

    // Local State
    const [subject, setSubject] = useState('Polity');
    const [question, setQuestion] = useState('');
    const [answerText, setAnswerText] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);

    // Fetch History
    const fetchHistory = async () => {
        if (!user) return;
        try {
            const q = query(
                collection(db, 'users', user.uid, 'mains_evaluations'),
                orderBy('evaluatedAt', 'desc'),
                limit(10)
            );
            const snapshot = await getDocs(q);
            setRecentEvals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            logger.error("Failed to fetch mains history", error);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchHistory();
    }, [user]);

    const handleAnalysis = async () => {
        if (!question.trim() || !answerText.trim()) return;

        setAnalyzing(true);
        setResult(null);

        try {
            const analysis = await evaluateAnswer(question, answerText, subject);
            setResult(analysis);

            // Save to Firestore
            if (user) {
                await addDoc(collection(db, 'users', user.uid, 'mains_evaluations'), {
                    subject,
                    question,
                    answer: answerText,
                    result: analysis,
                    evaluatedAt: serverTimestamp()
                });
                fetchHistory(); // Refresh sidebar
            }
        } catch (error) {
            logger.error("Analysis failed", error);
            alert("Failed to analyze answer. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const loadFromHistory = (item) => {
        setSubject(item.subject || 'General');
        setQuestion(item.question || '');
        setAnswerText(item.answer || item.text || '');
        setResult(item.result);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0;

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-indigo-950 tracking-tight mb-1">
                        Mains AI Evaluator
                    </h1>
                    <p className="text-slate-500 text-base font-medium">
                        Get production-grade feedback on your answer writing.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Input Config Card */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="md:col-span-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Subject</label>
                                <div className="relative">
                                    <CustomDropdown
                                        options={[
                                            ...Object.keys(UPSC_SYLLABUS).map(key => ({ label: UPSC_SYLLABUS[key].name, value: key })),
                                            { label: 'General / Essay', value: 'General' }
                                        ]}
                                        value={subject}
                                        onChange={(val) => setSubject(val)}
                                        fullWidth={true}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Question</label>
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="Enter the exact question here..."
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2278B0]"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Your Answer</label>
                            <textarea
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2278B0] text-slate-800 resize-none font-serif text-lg leading-relaxed bg-slate-50/50"
                                placeholder="Paste your answer text here..."
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 font-medium">{wordCount} Words</span>
                            <button
                                onClick={handleAnalysis}
                                disabled={analyzing || !answerText.trim() || !question.trim()}
                                className="px-8 py-3 bg-[#2278B0] hover:bg-[#1b5f8a] text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#2278B0]/20 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                {analyzing ? (
                                    <RefreshCw className="animate-spin" size={18} />
                                ) : (
                                    <Sparkles size={18} />
                                )}
                                {analyzing ? 'Grading...' : 'Evaluate Answer'}
                            </button>
                        </div>
                    </div>

                    {/* Analysis Result */}
                    {result && (
                        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#2278B0] to-indigo-600" />

                            {/* Result Header */}
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 mb-1">
                                        Evaluation Report
                                    </h2>
                                    <div className="flex gap-2 text-sm text-slate-500">
                                        <span className="font-bold text-[#2278B0]">{subject}</span>
                                        <span>•</span>
                                        <span>{new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-5xl font-black text-[#2278B0] track-tighter">
                                        {result.score}
                                        <span className="text-2xl text-slate-300 font-bold ml-1">/10</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Score</div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* Feedback Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                                        <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2 uppercase text-xs tracking-wider">
                                            <CheckCircle size={16} /> Strengths
                                        </h4>
                                        <ul className="space-y-2">
                                            {result.feedback?.strengths?.map((s, i) => (
                                                <li key={i} className="text-sm text-green-700 leading-relaxed flex gap-2">
                                                    <span className="block w-1 h-1 bg-green-400 rounded-full mt-2 shrink-0" />
                                                    {s}
                                                </li>
                                            ))}
                                            {(!result.feedback?.strengths?.length) && <li className="text-sm text-slate-400 italic">No specific strengths detected.</li>}
                                        </ul>
                                    </div>

                                    <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                                        <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2 uppercase text-xs tracking-wider">
                                            <XCircle size={16} /> Weaknesses
                                        </h4>
                                        <ul className="space-y-2">
                                            {result.feedback?.weaknesses?.map((w, i) => (
                                                <li key={i} className="text-sm text-red-700 leading-relaxed flex gap-2">
                                                    <span className="block w-1 h-1 bg-red-400 rounded-full mt-2 shrink-0" />
                                                    {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Model Structure */}
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase text-xs tracking-wider">
                                        <Brain size={16} className="text-[#2278B0]" /> Recommended Structure
                                    </h4>
                                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                                        {result.feedback?.modelStructure || "Introduction → Core Arguments → Conclusion"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - History */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <History size={20} className="text-orange-500" /> Evaluation History
                        </h3>
                        <div className="space-y-4">
                            {recentEvals.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <History size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No recent evaluations</p>
                                </div>
                            ) : (
                                recentEvals.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => loadFromHistory(item)}
                                        className="group p-4 hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#2278B0]/30 cursor-pointer transition-all hover:shadow-md"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold uppercase text-slate-500 group-hover:bg-[#2278B0]/10 group-hover:text-[#2278B0] transition-colors">
                                                {item.subject || 'General'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {item.evaluatedAt?.toDate ? item.evaluatedAt.toDate().toLocaleDateString() : 'Just now'}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-[#2278B0] transition-colors">
                                            {item.question || "No Question Title"}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#2278B0] rounded-full"
                                                    style={{ width: `${(parseFloat(item.result?.score || 0) / 10) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{item.result?.score || 0}/10</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainsEvaluatorView;
