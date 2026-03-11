import React, { useState } from 'react';
import { Save, Plus, Trash2, ArrowLeft, RefreshCw, CheckCircle, FileText, Sparkles, Upload, BookOpen, Settings, Users, Calendar } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import logger from '../../utils/logger';
import { generateQuestions, generateQuestionsFromDocument, suggestTestTopics } from '../../services/geminiService';
import { extractTextFromPDF } from '../../utils/pdfExtractor';
import { batchService } from '../../features/exam-engine/services/batchService';
import { CustomDropdown } from '../common';
import { toast } from '../../utils/toast';

const TestCreator = ({ userData }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [testCode, setTestCode] = useState(null);

    // Modes: 'manual' | 'topic' | 'pdf'
    const [mode, setMode] = useState('manual');

    // Test Metadata
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('General');
    const [duration, setDuration] = useState(60);

    // Questions State
    const [questions, setQuestions] = useState([
        { id: 1, text: '', options: ['', '', '', ''], correctOption: 0 }
    ]);

    // AI Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState(0);
    const [genConfig, setGenConfig] = useState({
        topic: '',
        count: 10,
        difficulty: 'Hard',
        file: null
    });

    const [accessType, setAccessType] = useState('public'); // 'public' | 'private'
    const [batches, setBatches] = useState([]);
    const [selectedBatchIds, setSelectedBatchIds] = useState([]);

    // Scheduling State
    const [enableSchedule, setEnableSchedule] = useState(false);
    const [scheduledStart, setScheduledStart] = useState('');
    const [scheduledEnd, setScheduledEnd] = useState('');

    // Auto-Suggest State
    const [topicSuggestions, setTopicSuggestions] = useState([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionTimeoutRef = React.useRef(null);
    const abortControllerRef = React.useRef(null);

    React.useEffect(() => {
        const loadBatches = async () => {
            if (userData?.uid) {
                try {
                    const data = await batchService.getInstitutionBatches(userData.uid);
                    setBatches(data);

                    // Pre-select batch from URL param
                    const batchIdParam = searchParams.get('batchId');
                    if (batchIdParam && data.some(b => b.id === batchIdParam)) {
                        setAccessType('private');
                        setSelectedBatchIds([batchIdParam]);
                    }
                } catch (error) {
                    logger.error("Failed to load batches", error);
                }
            }
        };
        loadBatches();
    }, [userData, searchParams]);

    // AI Auto-Suggest Effect
    React.useEffect(() => {
        // Clear previous timeout and abort ongoing request
        if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const keyword = genConfig.topic.trim();

        // Hide suggestions if empty or too short
        if (!keyword || keyword.length < 2) {
            setTopicSuggestions([]);
            setIsSuggesting(false);
            return;
        }

        // Only show loading if we're actually going to fetch
        if (showSuggestions) {
            setIsSuggesting(true);
        }

        // Debounce API call (500ms)
        suggestionTimeoutRef.current = setTimeout(async () => {
            if (!showSuggestions) return; // Don't fetch if user already selected

            abortControllerRef.current = new AbortController();

            try {
                const results = await suggestTestTopics(keyword, 'UPSC CSE', abortControllerRef.current.signal);
                // Only update if the result is for the current keyword (handled mostly by abort)
                setTopicSuggestions(results);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setTopicSuggestions([]);
                }
            } finally {
                setIsSuggesting(false);
            }
        }, 600);

        return () => {
            if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [genConfig.topic, showSuggestions]);

    // --- Handlers ---
    const addQuestion = () => {
        setQuestions([
            ...questions,
            { id: Date.now(), text: '', options: ['', '', '', ''], correctOption: 0 }
        ]);
    };

    const removeQuestion = (index) => {
        if (questions.length === 1 && mode === 'manual') return;
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleTopicGeneration = async () => {
        if (!genConfig.topic) return toast.warning('Please enter a topic');
        setIsGenerating(true);
        setGenProgress(10);

        try {
            const newQuestions = await generateQuestions(
                genConfig.topic,
                parseInt(genConfig.count),
                genConfig.difficulty,
                'UPSC CSE',
                (progress) => setGenProgress(progress)
            );

            if (newQuestions && newQuestions.length > 0) {
                const formattedQuestions = newQuestions.map((q, idx) => ({
                    id: Date.now() + idx,
                    text: q.text,
                    options: q.options,
                    correctOption: q.correctAnswer || 0,
                    explanation: q.explanation
                }));

                setQuestions(prev => {
                    if (prev.length === 1 && !prev[0].text) return formattedQuestions;
                    return [...prev, ...formattedQuestions];
                });

                if (!title) setTitle(`${genConfig.topic} Priority Test`);
                if (!subject) setSubject(genConfig.topic);
                setMode('manual');
                toast.success(`Successfully generated ${formattedQuestions.length} questions!`);
            } else {
                toast.error('Failed to generate questions. Please try again.');
            }
        } catch (error) {
            logger.error('Topic Generation Error', error);
            toast.error('Error generating questions: ' + error.message);
        } finally {
            setIsGenerating(false);
            setGenProgress(0);
        }
    };

    const handlePDFUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setGenConfig({ ...genConfig, file });
    };

    const handlePDFGeneration = async () => {
        if (!genConfig.file) return toast.warning('Please upload a PDF file');
        setIsGenerating(true);
        setGenProgress(10);

        try {
            setGenProgress(20);
            const pdfUrl = URL.createObjectURL(genConfig.file);
            const text = await extractTextFromPDF(pdfUrl);

            if (!text || text.length < 100) throw new Error('Could not extract enough text from PDF. The document may be image-based or too short.');

            setGenProgress(40);
            const newQuestions = await generateQuestionsFromDocument(
                text,
                genConfig.file.name,
                parseInt(genConfig.count),
                genConfig.difficulty,
                (p) => setGenProgress(40 + (p * 0.6))
            );

            if (newQuestions && newQuestions.length > 0) {
                const formattedQuestions = newQuestions.map((q, idx) => ({
                    id: Date.now() + idx,
                    text: q.text,
                    options: q.options,
                    correctOption: q.correctAnswer || 0,
                    explanation: q.explanation
                }));

                setQuestions(prev => {
                    if (prev.length === 1 && !prev[0].text) return formattedQuestions;
                    return [...prev, ...formattedQuestions];
                });

                if (!title) setTitle(`${genConfig.file.name.replace('.pdf', '')} Test`);
                setMode('manual');
                toast.success(`Successfully generated ${formattedQuestions.length} questions from PDF!`);
            }
        } catch (error) {
            logger.error('PDF Generation Error', error);
            toast.error('Error processing PDF: ' + error.message);
        } finally {
            setIsGenerating(false);
            setGenProgress(0);
        }
    };

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handlePublish = async () => {
        if (!title) return toast.warning('Please enter a test title');
        if (questions.length === 0) return toast.warning('Test must have at least one question');

        const invalidQ = questions.find(q => !q.text || q.options.some(o => !o));
        if (invalidQ) return toast.warning(`Question "${invalidQ.text || 'Untitled'}" is incomplete.`);

        if (accessType === 'private' && selectedBatchIds.length === 0) {
            return toast.warning("Please select at least one batch for a private test.");
        }

        if (enableSchedule) {
            if (!scheduledStart || !scheduledEnd) return toast.warning('Please set both start and end times for the scheduled test.');
            if (new Date(scheduledEnd) <= new Date(scheduledStart)) return toast.warning('End time must be after start time.');
        }

        setIsSubmitting(true);
        try {
            const code = accessType === 'public' ? generateCode() : null;
            const testData = {
                title,
                subject,
                duration: parseInt(duration),
                questions: questions.map(q => ({
                    text: q.text,
                    options: q.options,
                    correctAnswer: q.options[q.correctOption],
                    explanation: q.explanation || ''
                })),
                creatorId: userData.uid,
                creatorName: userData.institutionProfile?.name || 'Institution',
                testCode: code,
                createdAt: serverTimestamp(),
                status: 'active',
                attemptCount: 0,

                // Access Control
                accessType, // 'public' | 'private'
                assignedBatchIds: accessType === 'private' ? selectedBatchIds : [],

                // Scheduling
                scheduledStart: enableSchedule && scheduledStart ? Timestamp.fromDate(new Date(scheduledStart)) : null,
                scheduledEnd: enableSchedule && scheduledEnd ? Timestamp.fromDate(new Date(scheduledEnd)) : null,
                isScheduled: enableSchedule
            };

            await addDoc(collection(db, 'institution_tests'), testData);
            setTestCode(code);
            setIsPublished(true);
            logger.info('Test Published', { code });
        } catch (error) {
            logger.error('Error publishing test', error);
            toast.error('Failed to publish test. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isPublished) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 p-6 animate-in fade-in duration-500">
                <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 text-center max-w-lg w-full">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto text-green-600 shadow-sm">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Test Published!</h2>
                    <p className="text-slate-500 mb-8 font-medium">Your test is now live and ready for students.</p>

                    {accessType === 'public' && testCode ? (
                        <div
                            className="bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-2xl mb-8 relative group cursor-pointer hover:border-[#2278B0] hover:bg-blue-50/50 transition-all"
                            onClick={() => navigator.clipboard.writeText(testCode)}
                        >
                            <p className="text-xs uppercase font-bold text-slate-400 mb-2 tracking-widest">Access Code</p>
                            <div className="text-5xl font-mono font-black text-[#2278B0] tracking-widest">{testCode}</div>
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-slate-800 text-white px-2 py-1 rounded shadow-lg">
                                Copy
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-8">
                            <p className="text-blue-800 font-bold mb-2">Private Batch Test</p>
                            <p className="text-sm text-blue-600">This test has been added directly to the classroom dashboard of students in the selected batches.</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button onClick={() => navigate('/institution/dashboard')} className="w-full py-3.5 font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                            Return to Dashboard
                        </button>
                        <button onClick={() => {
                            setTestCode(null);
                            setIsPublished(false);
                            setTitle('');
                            setQuestions([{ id: 1, text: '', options: ['', '', '', ''], correctOption: 0 }]);
                            setIsSubmitting(false);
                            setMode('manual');
                        }} className="w-full py-3.5 bg-indigo-950 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-900 transition-all hover:shadow-xl hover:-translate-y-0.5">
                            Create Another Test
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg"><FileText size={18} /></span>
                            Test Creator
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <span className="hidden md:inline-block text-sm font-bold text-slate-400 mr-4">
                                {questions.length} Question{questions.length !== 1 && 's'}
                            </span>
                            <button onClick={() => navigate(-1)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-sm">
                                Cancel
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={isSubmitting || questions.length === 0}
                                className="px-5 py-2 bg-[#2278B0] text-white font-bold rounded-lg shadow-sm hover:bg-[#1b5f8a] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                Publish
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 pb-16">
                <div className="space-y-8">

                    {/* Row 1: CONFIGURATION GRIDS */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">

                        {/* 1. Test Metadata Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-lg border-b border-slate-100 pb-3">
                                <Settings size={20} className="text-slate-400" />
                                Basic Details
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Test Title</label>
                                    <input
                                        placeholder="e.g. Weekly History Mock Test 1"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Subject</label>
                                        <input
                                            placeholder="Subject"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Duration</label>
                                        <CustomDropdown
                                            options={[
                                                { label: '15 Mins', value: '15' },
                                                { label: '30 Mins', value: '30' },
                                                { label: '1 Hour', value: '60' },
                                                { label: '1.5 Hours', value: '90' },
                                                { label: '2 Hours', value: '120' },
                                                { label: '3 Hours', value: '180' }
                                            ]}
                                            value={String(duration)}
                                            onChange={(val) => setDuration(val)}
                                            fullWidth={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 1.5 Access Control */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-lg border-b border-slate-100 pb-3">
                                <Users size={20} className="text-slate-400" />
                                Access Control
                            </div>

                            <div className="space-y-3">
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${accessType === 'public' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="accessType"
                                        className="w-4 h-4 text-indigo-600 focus:ring-0"
                                        checked={accessType === 'public'}
                                        onChange={() => setAccessType('public')}
                                    />
                                    <div>
                                        <div className="font-bold text-slate-700 text-sm">Public (Open)</div>
                                        <div className="text-xs text-slate-400">Anyone with the code can join</div>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${accessType === 'private' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="accessType"
                                        className="w-4 h-4 text-indigo-600 focus:ring-0"
                                        checked={accessType === 'private'}
                                        onChange={() => setAccessType('private')}
                                    />
                                    <div>
                                        <div className="font-bold text-slate-700 text-sm">Private (Batch Only)</div>
                                        <div className="text-xs text-slate-400">Restricted to selected batches</div>
                                    </div>
                                </label>
                            </div>

                            {accessType === 'private' && (
                                <div className="animate-in slide-in-from-top-2 duration-200 pt-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Select Batches</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {batches.length === 0 && <div className="text-xs text-slate-400 italic">No batches found. Create one first.</div>}
                                        {batches.map(batch => (
                                            <label key={batch.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="rounded text-indigo-600 focus:ring-0"
                                                    checked={selectedBatchIds.includes(batch.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedBatchIds([...selectedBatchIds, batch.id]);
                                                        else setSelectedBatchIds(selectedBatchIds.filter(id => id !== batch.id));
                                                    }}
                                                />
                                                <span className="text-sm font-medium text-slate-700">{batch.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div> {/* End Row 1 */}

                    {/* Row 2: Schedule & Generator */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 items-start gap-6 lg:gap-8">

                        {/* 1.75 Scheduling */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                                    <Calendar size={20} className="text-slate-400" />
                                    Schedule
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEnableSchedule(!enableSchedule)}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${enableSchedule ? 'bg-indigo-600' : 'bg-slate-200'
                                        }`}
                                >
                                    <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enableSchedule ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                        }`} />
                                </button>
                            </div>

                            {!enableSchedule && (
                                <p className="text-xs text-slate-400">Test will go live immediately after publishing.</p>
                            )}

                            {enableSchedule && (
                                <div className="animate-in slide-in-from-top-2 duration-200 space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Starts At</label>
                                        <input
                                            type="datetime-local"
                                            value={scheduledStart}
                                            onChange={(e) => setScheduledStart(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Ends At</label>
                                        <input
                                            type="datetime-local"
                                            value={scheduledEnd}
                                            onChange={(e) => setScheduledEnd(e.target.value)}
                                            min={scheduledStart || undefined}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                                        />
                                    </div>
                                    {scheduledStart && scheduledEnd && new Date(scheduledEnd) > new Date(scheduledStart) && (
                                        <div className="bg-indigo-50 text-indigo-700 text-xs font-bold p-3 rounded-xl">
                                            Window: {new Date(scheduledStart).toLocaleString()} → {new Date(scheduledEnd).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Mode Selection & Input */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-1 bg-slate-50 m-2 rounded-xl flex">
                                {[
                                    { id: 'manual', label: 'Manual', icon: <Plus size={16} /> },
                                    { id: 'topic', label: 'AI Topic', icon: <Sparkles size={16} /> },
                                    { id: 'pdf', label: 'PDF Upload', icon: <Upload size={16} /> }
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setMode(m.id)}
                                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === m.id
                                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-slate-100'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                            }`}
                                    >
                                        {m.icon} {m.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6 pt-2">
                                {/* MANUAL MODE */}
                                {mode === 'manual' && (
                                    <div className="text-center py-6">
                                        <p className="text-slate-500 text-sm">Build your test question by question using the editor below.</p>
                                    </div>
                                )}

                                {/* TOPIC MODE */}
                                {mode === 'topic' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Target Topic</label>
                                            <div className="relative">
                                                <Sparkles className="absolute left-4 top-3.5 text-purple-500" size={18} />
                                                <input
                                                    placeholder="e.g. Indian Constitution"
                                                    value={genConfig.topic}
                                                    onChange={(e) => {
                                                        setShowSuggestions(true);
                                                        setGenConfig({ ...genConfig, topic: e.target.value });
                                                    }}
                                                    onFocus={() => setShowSuggestions(true)}
                                                    onBlur={() => {
                                                        // Delay hiding so clicks register
                                                        setTimeout(() => setShowSuggestions(false), 200);
                                                    }}
                                                    className="w-full pl-11 bg-slate-50 border border-slate-200 rounded-xl pr-4 py-3 font-medium focus:bg-white focus:border-purple-500 focus:ring-0 transition-all outline-none"
                                                />

                                                {/* Suggestions Tags */}
                                                {showSuggestions && genConfig.topic.length >= 2 && (
                                                    <div className="mt-2 w-full animate-in fade-in slide-in-from-top-1">
                                                        {isSuggesting ? (
                                                            <div className="text-xs text-slate-500 flex items-center gap-1.5 px-1 font-medium">
                                                                <RefreshCw size={12} className="animate-spin text-purple-500" /> AI is thinking...
                                                            </div>
                                                        ) : topicSuggestions.length > 0 ? (
                                                            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                                                                {topicSuggestions.map((suggestion, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setGenConfig({ ...genConfig, topic: suggestion });
                                                                            setShowSuggestions(false);
                                                                        }}
                                                                        className="flex-shrink-0 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded-full hover:bg-purple-100 hover:border-purple-200 transition-all flex items-center gap-1.5 shadow-sm hover:shadow"
                                                                    >
                                                                        <Sparkles size={10} className="text-purple-500 opacity-70" />
                                                                        {suggestion}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Count</label>
                                                <CustomDropdown
                                                    options={[
                                                        { label: '5 Qs', value: '5' },
                                                        { label: '10 Qs', value: '10' },
                                                        { label: '20 Qs', value: '20' }
                                                    ]}
                                                    value={String(genConfig.count)}
                                                    onChange={(val) => setGenConfig({ ...genConfig, count: val })}
                                                    fullWidth={true}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Difficulty</label>
                                                <CustomDropdown
                                                    options={[
                                                        { label: 'Easy', value: 'Easy' },
                                                        { label: 'Medium', value: 'Medium' },
                                                        { label: 'Hard', value: 'Hard' }
                                                    ]}
                                                    value={genConfig.difficulty}
                                                    onChange={(val) => setGenConfig({ ...genConfig, difficulty: val })}
                                                    fullWidth={true}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleTopicGeneration}
                                            disabled={isGenerating || !genConfig.topic}
                                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                            Generate with AI
                                        </button>

                                        {isGenerating && (
                                            <div className="space-y-2 pt-2">
                                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                                    <span>Generating Content...</span>
                                                    <span>{Math.round(genProgress)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${genProgress}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* PDF MODE */}
                                {mode === 'pdf' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Source Document</label>
                                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-orange-500 hover:bg-orange-50/50 transition-colors cursor-pointer relative group">
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={handlePDFUpload}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="mx-auto w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-orange-200 transition-colors">
                                                    <Upload size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-slate-700 truncate max-w-[200px] mx-auto">
                                                    {genConfig.file ? genConfig.file.name : 'Click to Upload PDF'}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">Max 20MB</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Count</label>
                                                <CustomDropdown
                                                    options={[
                                                        { label: '5 Qs', value: '5' },
                                                        { label: '10 Qs', value: '10' },
                                                        { label: '20 Qs', value: '20' }
                                                    ]}
                                                    value={String(genConfig.count)}
                                                    onChange={(val) => setGenConfig({ ...genConfig, count: val })}
                                                    fullWidth={true}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Difficulty</label>
                                                <CustomDropdown
                                                    options={[
                                                        { label: 'Easy', value: 'Easy' },
                                                        { label: 'Medium', value: 'Medium' },
                                                        { label: 'Hard', value: 'Hard' }
                                                    ]}
                                                    value={genConfig.difficulty}
                                                    onChange={(val) => setGenConfig({ ...genConfig, difficulty: val })}
                                                    fullWidth={true}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handlePDFGeneration}
                                            disabled={isGenerating || !genConfig.file}
                                            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <BookOpen size={20} />}
                                            Analyze & Generate
                                        </button>

                                        {isGenerating && (
                                            <div className="space-y-2 pt-2">
                                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                                    <span>Processing PDF...</span>
                                                    <span>{Math.round(genProgress)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${genProgress}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div> {/* End Row 2 */}

                    {/* FULL WIDTH: QUESTION EDITOR */}
                    <div className="space-y-6 border-t border-slate-200 pt-8 mt-8">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-sm font-black border border-slate-200">
                                    {questions.length}
                                </span>
                                Questions Added
                            </h3>
                            {questions.length > 0 && (
                                <button onClick={() => setQuestions([])} className="text-red-500 text-xs font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                                    Clear All
                                </button>
                            )}
                        </div>

                        <div className="space-y-6">
                            {questions.map((q, qIdx) => (
                                <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative group animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-slate-100 text-slate-500 text-xs font-black px-2 py-1 rounded-md uppercase tracking-wider">
                                                Q{qIdx + 1}
                                            </span>
                                        </div>
                                        <button onClick={() => removeQuestion(qIdx)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="mb-6">
                                        <textarea
                                            placeholder="Type your question here..."
                                            value={q.text}
                                            onChange={(e) => {
                                                updateQuestion(qIdx, 'text', e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-800 min-h-[100px] focus:bg-white focus:border-indigo-500 focus:ring-0 outline-none resize-none transition-colors overflow-hidden placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className={`flex items-center gap-3 p-1 rounded-xl transition-all ${q.correctOption === oIdx ? 'bg-green-50/50' : ''}`}>
                                                <div className="relative">
                                                    <input
                                                        type="radio"
                                                        name={`q-${q.id}-correct`}
                                                        checked={q.correctOption === oIdx}
                                                        onChange={() => updateQuestion(qIdx, 'correctOption', oIdx)}
                                                        className="peer sr-only"
                                                    />
                                                    <div
                                                        onClick={() => updateQuestion(qIdx, 'correctOption', oIdx)}
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all border-2 ${q.correctOption === oIdx
                                                            ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200'
                                                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {String.fromCharCode(65 + oIdx)}
                                                    </div>
                                                </div>

                                                <input
                                                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                                    value={opt}
                                                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                                    className={`flex-1 bg-white border rounded-xl px-4 py-3 text-sm font-medium focus:ring-0 outline-none transition-all ${q.correctOption === oIdx
                                                        ? 'border-green-500 ring-2 ring-green-100 text-green-700'
                                                        : 'border-slate-200 text-slate-700 focus:border-indigo-500'
                                                        }`}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {q.explanation && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Explanation</p>
                                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                {q.explanation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {questions.length === 0 && (
                                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <BookOpen size={40} />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-700 mb-2">Workspace Empty</h4>
                                    <p className="text-slate-400 max-w-xs mx-auto mb-6">
                                        Use the panel on the left to add questions manually, by topic, or from a PDF.
                                    </p>
                                    <button
                                        onClick={addQuestion}
                                        className="bg-white border-2 border-dashed border-indigo-200 text-indigo-600 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all inline-flex items-center gap-2 shadow-sm hover:shadow"
                                    >
                                        <Plus size={20} />
                                        Add First Question
                                    </button>
                                </div>
                            )}

                            {/* Floating "Add Question" Button mimicking Google Forms */}
                            {questions.length > 0 && (
                                <div className="flex justify-center mt-8">
                                    <button
                                        onClick={addQuestion}
                                        className="bg-white border-2 border-dashed border-indigo-200 text-indigo-600 font-bold px-8 py-4 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center gap-3 shadow-sm hover:shadow"
                                    >
                                        <Plus size={20} />
                                        Add Another Question
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer actions moved to header to completely prevent overlap on scrolling */}
        </div>
    );
};

export default TestCreator;
