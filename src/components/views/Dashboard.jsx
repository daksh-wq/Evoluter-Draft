import React, { useState } from 'react';
import {
    Brain,
    Zap,
    Shield,
    CalendarDays,
    Flame,
    Cpu,
    Sparkles,
    RefreshCw,
    AlertTriangle,
    Building2,
    Link as LinkIcon,
    FileText as FileTextIcon,
    Eye,
    Bell
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { KnowledgeGraph } from '../common';
import { SubjectSelector } from '../dashboard/SubjectSelector';
import { TopicInput } from '../dashboard/TopicInput';
import { ConfigPanel } from '../dashboard/ConfigPanel';
import { LoadingState } from '../dashboard/LoadingState';
import { DEFAULT_QUESTION_COUNT, DEFAULT_DIFFICULTY } from '../../constants/appConstants';
import { useDailyWisdom } from '../../hooks/useDailyWisdom';
import { useExamDate } from '../../hooks/useExamDate';
import { suggestTestTopics } from '../../services/geminiService';
import { extractTextFromPDF } from '../../utils/pdfExtractor';
import { batchService } from '../../features/exam-engine/services/batchService';
import { UserCheck } from 'lucide-react';
/**
 * Dashboard Component
 * Main command center with stats, AI generator, and quick actions
 */
const Dashboard = ({
    userStats,
    userData, // New prop
    setView,
    generateAITest,
    isGeneratingTest,
    generationProgress, // New prop
    startMission,
}) => {
    const [aiTopic, setAiTopic] = useState('');
    const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
    const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
    const [pyqPercentage, setPyqPercentage] = useState(0);

    // Live Test Notifications State
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationsRef = React.useRef(null);

    // Handle click outside to close notifications
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // AI Auto-Suggest State
    const [topicSuggestions, setTopicSuggestions] = useState([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionTimeoutRef = React.useRef(null);
    const abortControllerRef = React.useRef(null);

    // Resource Upload & Preview State
    const [uploadedResource, setUploadedResource] = useState(''); // Text or Link
    const [resourceType, setResourceType] = useState(null); // 'Link' | 'PDF'
    const [resourceName, setResourceName] = useState('');
    const [previewQuestions, setPreviewQuestions] = useState([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const fileInputRef = React.useRef(null);

    // Smart Features Hooks
    const { quote, loading: quoteLoading } = useDailyWisdom();

    // Ensure we don't show past years
    const currentYear = new Date().getFullYear();
    const effectiveYear = (userData?.targetYear && userData.targetYear >= currentYear)
        ? userData.targetYear
        : currentYear;

    const { examDate, daysRemaining, isOfficial, loading: dateLoading } = useExamDate(userData?.targetExam, effectiveYear);

    const handleGenerateTest = () => {
        if (aiTopic.trim() || uploadedResource) {
            // Note: generateAITest in Context needs to accept resource context if provided
            // For now, if there's no aiTopic but there is a resource, we'll use the resource name as a 'topic'
            const finalTopic = aiTopic.trim() || `Test from ${resourceName}`;
            generateAITest(finalTopic, questionCount, difficulty, uploadedResource, pyqPercentage);
            setAiTopic('');
            setUploadedResource('');
            setPreviewQuestions([]);
            setResourceName('');
            setPyqPercentage(0);
        }
    };

    const processResource = async (content, type, name) => {
        setIsPreviewLoading(true);
        setPreviewError('');
        setPreviewQuestions([]);
        setUploadedResource(content);
        setResourceType(type);
        setResourceName(name);
        setIsPreviewLoading(false);
    };

    const handleFileUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsPreviewLoading(true);
        setPreviewError('');

        try {
            // Convert file to temporary Object URL to extract using pdf.js
            const fileUrl = URL.createObjectURL(file);
            const extractedText = await extractTextFromPDF(fileUrl);

            if (!extractedText || extractedText.trim().length === 0) {
                setPreviewError("PDF seems empty — no readable content detected.");
                setIsPreviewLoading(false);
                return;
            }

            processResource(extractedText, 'PDF', file.name);
            URL.revokeObjectURL(fileUrl);
        } catch (error) {
            console.error('PDF extraction failed:', error);
            setPreviewError("Failed to extract text from PDF.");
            setIsPreviewLoading(false);
        }
        e.target.value = ''; // clear input
    };

    // AI Auto-Suggest Effect
    React.useEffect(() => {
        if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const keyword = aiTopic.trim();

        if (!keyword || keyword.length < 2) {
            setTopicSuggestions([]);
            setIsSuggesting(false);
            return;
        }

        if (showSuggestions) {
            setIsSuggesting(true);
        }

        suggestionTimeoutRef.current = setTimeout(async () => {
            if (!showSuggestions) return;

            abortControllerRef.current = new AbortController();

            try {
                const results = await suggestTestTopics(keyword, userData?.targetExam || 'UPSC CSE', abortControllerRef.current.signal);
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
    }, [aiTopic, showSuggestions, userData?.targetExam]);

    // Fetch active institution tests and batches for notifications
    React.useEffect(() => {
        const fetchNotificationsData = async () => {
            const hasBatches = userData?.enrolledBatches && userData.enrolledBatches.length > 0;
            const hasInstitutions = userData?.joinedInstitutions && userData.joinedInstitutions.length > 0;

            if (!hasBatches && !hasInstitutions) {
                setNotifications([]);
                return;
            }

            try {
                const allTestDocs = [];
                
                if (hasBatches) {
                    const batchIds = userData.enrolledBatches;
                    const chunks = [];
                    for (let i = 0; i < batchIds.length; i += 10) {
                        chunks.push(batchIds.slice(i, i + 10));
                    }

                    for (const chunk of chunks) {
                        const q = query(
                            collection(db, 'institution_tests'),
                            where('assignedBatchIds', 'array-contains-any', chunk)
                        );
                        const snap = await getDocs(q);
                        snap.docs.forEach(d => {
                            if (!allTestDocs.find(t => t.id === d.id)) {
                                allTestDocs.push({ id: d.id, ...d.data() });
                            }
                        });
                    }
                }

                const now = new Date();
                const activeTests = allTestDocs.filter(t => {
                    if (t.status === 'archived' || t.status === 'inactive') return false;
                    
                    if (!t.isScheduled || (!t.scheduledStart && !t.scheduledEnd)) return true;
                    
                    const start = t.scheduledStart?.toDate ? t.scheduledStart.toDate() : (t.scheduledStart ? new Date(t.scheduledStart) : null);
                    const end = t.scheduledEnd?.toDate ? t.scheduledEnd.toDate() : (t.scheduledEnd ? new Date(t.scheduledEnd) : null);
                    
                    // Count if it's Live or Upcoming
                    if (end && now > end) return false; // ended
                    return true;
                });

                let fetchedBatches = [];
                let fetchedInstitutions = [];

                // Fetch batch details to show recent batches
                try {
                    const myBatches = await batchService.getStudentBatches(userData.uid);
                    fetchedBatches = myBatches || [];
                } catch (batchErr) {
                    console.error("Failed to fetch batches for notifications", batchErr);
                }

                // Fetch recently joined institutions
                if (userData.joinedInstitutions && userData.joinedInstitutions.length > 0) {
                    try {
                        const instPromises = userData.joinedInstitutions.map(async (instId) => {
                            const instRef = doc(db, 'users', instId);
                            const instSnap = await getDoc(instRef);
                            if (instSnap.exists()) {
                                return {
                                    id: instId,
                                    name: instSnap.data().displayName || instSnap.data().name || 'Institution'
                                };
                            }
                            return null;
                        });
                        const results = await Promise.all(instPromises);
                        fetchedInstitutions = results.filter(i => i !== null);
                    } catch (instErr) {
                        console.error("Failed to fetch institutions for notifications", instErr);
                    }
                }

                // Combine and sort notifications
                const combined = [
                    ...activeTests.map(t => ({
                        type: 'test',
                        id: `test-${t.id}`,
                        data: t,
                        timestamp: t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now()
                    })),
                    ...fetchedBatches.map(b => ({
                        type: 'batch',
                        id: `batch-${b.id}`,
                        data: b,
                        // joinedAt is usually set in members collection, but if unavailable use a fallback or createdAt if present
                        // For student batches, we might not have exact joinedAt unless explicitly fetched. We'll use Date.now() if missing to prioritize new joins.
                        timestamp: b.joinedAt?.seconds ? b.joinedAt.seconds * 1000 : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.now())
                    })),
                    ...fetchedInstitutions.map(inst => ({
                        type: 'institution',
                        id: `inst-${inst.id}`,
                        data: inst,
                        // We do not have a robust timestamp locally without querying the exact student subcollection within the institution
                        // This timestamp will prioritize newly joined institutions since Date.now() is used if none exists.
                        timestamp: Date.now()
                    }))
                ];

                // Sort descending (newest first)
                combined.sort((a, b) => b.timestamp - a.timestamp);
                
                setNotifications(combined);
            } catch (error) {
                console.error("Failed to fetch notifications data:", error);
            }
        };

        if (userData?.uid) {
            fetchNotificationsData();
        }
    }, [userData?.enrolledBatches, userData?.joinedInstitutions, userData?.uid]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header with Stats */}
            <header className="relative flex items-start justify-between gap-4">
                <div className="pr-24 sm:pr-32 min-w-0 flex-1">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-950 tracking-tight mb-1 sm:mb-2">
                        Command Center
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold ${userData?.hasPremiumPlan ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-[#2278B0]/10 text-[#2278B0]'}`}>
                            {userData?.hasPremiumPlan ? 'PREMIUM' : 'FREE PLAN'}
                        </span>
                        <span>Welcome back, Scholar.</span>
                    </p>
                </div>

                {/* Top Right Actions */}
                <div className="absolute top-0 right-0 flex items-center gap-3">
                    {/* Notification Bell with Dropdown */}
                    <div className="relative" ref={notificationsRef}>
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`bg-white w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border ${showNotifications ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'} shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all shrink-0`}
                            title="Notifications"
                        >
                            <Bell size={24} className={showNotifications ? "text-indigo-600" : "text-slate-600"} />
                            {/* Notification Badge */}
                            {notifications.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in">
                                    {notifications.length > 99 ? '99+' : notifications.length}
                                </span>
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-slate-800">Notifications</h3>
                                    {notifications.length > 0 && (
                                        <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-full">
                                            {notifications.length} New
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto p-2 scrollbar-hide">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-2">
                                            <Bell size={24} className="text-slate-300" />
                                            <span className="text-sm">No new notifications</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {notifications.map(item => {
                                                if (item.type === 'batch') {
                                                    const batch = item.data;
                                                    return (
                                                        <div 
                                                            key={item.id}
                                                            onClick={() => {
                                                                setShowNotifications(false);
                                                                setView('student/classroom');
                                                            }}
                                                            className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group flex gap-3 items-start border-b border-slate-50"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                                <Building2 size={14} />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800 line-clamp-1">Joined Batch {batch.name}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">You have been added to the batch <span className="font-semibold">{batch.name}</span>.</div>
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (item.type === 'test') {
                                                    const test = item.data;
                                                    return (
                                                        <div 
                                                            key={item.id} 
                                                            onClick={() => {
                                                                setShowNotifications(false);
                                                                setView('student/classroom');
                                                            }}
                                                            className="p-3 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors group flex gap-3 items-start border-b border-slate-50"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                <FileTextIcon size={14} />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800 line-clamp-1">{test.title}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">is Live!</div>
                                                                <div className="text-[10px] text-indigo-600 font-bold mt-1.5 uppercase tracking-wide">
                                                                    Tap to view in Classroom
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (item.type === 'institution') {
                                                    const inst = item.data;
                                                    return (
                                                        <div 
                                                            key={item.id}
                                                            onClick={() => {
                                                                setShowNotifications(false);
                                                                setView('student/classroom');
                                                            }}
                                                            className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group flex gap-3 items-start border-b border-slate-50"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                <UserCheck size={14} />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800 line-clamp-1">Joined Institution: {inst.name}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">You have been exclusively invited and added to <span className="font-semibold">{inst.name}</span>.</div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                </div>
                                {notifications.length > 0 && (
                                    <div className="p-3 border-t border-slate-100 bg-slate-50 text-center hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => {
                                        setShowNotifications(false);
                                        setView('student/classroom');
                                    }}>
                                        <span className="text-xs font-bold text-indigo-600">View All in Classroom</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Streak Card */}
                    <div className="bg-white w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 shrink-0">
                        <div className={`text-base sm:text-lg font-black leading-none ${userStats.streakDays > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                            {userStats.streakDays}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                            Day Streak
                        </div>
                    </div>
                </div>
            </header>

            {/* Target Exam & Quote Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Target Exam Card */}
                <div className="bg-indigo-950 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                    <div className="absolute top-2 right-2 p-4 opacity-10">
                        <CalendarDays size={64} />
                    </div>
                    <div>
                        <div className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
                            Target Exam
                        </div>
                        <h3 className="text-lg md:text-xl font-bold z-10 relative">
                            {userData?.targetExam || 'UPSC CSE'} {effectiveYear}
                        </h3>
                    </div>
                    <div className="mt-4 z-10 relative flex items-baseline gap-2">
                        {dateLoading ? (
                            <div className="w-24 h-10 bg-indigo-900/50 rounded-lg animate-pulse" />
                        ) : (
                            <>
                                <span className="text-3xl md:text-4xl font-black text-white leading-none">
                                    {daysRemaining}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-xs md:text-sm text-blue-200">Days Remaining</span>
                                    {!isOfficial && (
                                        <span className="text-[10px] text-blue-300 italic leading-tight">*AI Estimated</span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Daily Quote Card */}
                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-center relative overflow-hidden min-h-[180px]">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#2278B0]/5 rounded-full blur-xl" />
                    <h4 className="text-[#2278B0] font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Sparkles size={16} /> Daily Wisdom
                    </h4>
                    {quoteLoading ? (
                        <div className="space-y-3 mt-2">
                            <div className="h-4 bg-slate-200 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-slate-200 rounded animate-pulse w-4/5"></div>
                        </div>
                    ) : (
                        <p className={`text-base md:text-xl font-serif text-slate-800 italic leading-relaxed transition-opacity duration-500`}>
                            {quote}
                        </p>
                    )}
                </div>
            </div>

            {/* AI Neural Engine Section */}
            <div className="rounded-3xl bg-indigo-950 p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-900/20">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
                            <Zap size={20} fill="white" />
                        </div>
                        <span className="font-bold text-blue-100 tracking-wide uppercase text-xs">
                            AI Neural Engine
                        </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2">Generate Custom Drill</h2>
                    <p className="text-blue-100 max-w-xl text-base md:text-lg leading-relaxed mb-6 md:mb-8">
                        Select a subject or type a specific topic. The AI will generate a unique diagnostic test tailored to your needs.
                    </p>

                    {/* Controls Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 xl:gap-8 max-w-6xl relative">
                        {/* Left Side: Primary Inputs */}
                        <div className="flex flex-col gap-5 md:gap-6">
                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".pdf"
                                className="hidden"
                            />

                            {/* Main Input Group */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <SubjectSelector onSelect={setAiTopic} />

                                <TopicInput
                                    value={aiTopic}
                                    onChange={(val) => {
                                        setShowSuggestions(true);
                                        setAiTopic(val);
                                    }}
                                    onEnter={handleGenerateTest}
                                    setShowSuggestions={setShowSuggestions}
                                />
                            </div>

                            {/* AI Suggestions Tags Here Below the Grid */}
                            <div className="min-h-[2.5rem] w-full mt-[-0.5rem]">
                                {showSuggestions && aiTopic.length >= 2 && (
                                    <div className="w-full animate-in fade-in slide-in-from-top-1">
                                        {isSuggesting ? (
                                            <div className="text-xs text-blue-200 flex items-center gap-1.5 px-2 font-medium">
                                                <div className="animate-spin w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full" />
                                                Neural Engine analyzing...
                                            </div>
                                        ) : topicSuggestions?.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {topicSuggestions.map((suggestion, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setAiTopic(suggestion);
                                                            setShowSuggestions(false);
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-bold text-white bg-white/10 border border-white/20 rounded-full hover:bg-white/20 hover:border-white/30 transition-all flex items-center gap-1.5 shadow-sm"
                                                    >
                                                        <Sparkles size={10} className="text-blue-300 opacity-70" />
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            {/* Resource Upload Section */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-blue-200 uppercase tracking-wider">
                                        Attach Resource (Optional)
                                    </span>
                                    {resourceType && (
                                        <button
                                            onClick={() => {
                                                setUploadedResource('');
                                                setResourceType(null);
                                                setResourceName('');
                                                setPreviewQuestions([]);
                                                setPreviewError('');
                                            }}
                                            className="text-xs text-red-300 hover:text-red-400 font-bold"
                                        >
                                            Clear Resource
                                        </button>
                                    )}
                                </div>

                                {!resourceType ? (
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleFileUploadClick}
                                            disabled={isPreviewLoading}
                                            className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl py-3 px-4 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <FileTextIcon size={16} />
                                            Upload PDF Document
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-indigo-900/50 border border-indigo-800/50 rounded-xl p-3">
                                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300">
                                            <FileTextIcon size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{resourceName}</div>
                                            <div className="text-xs text-blue-300">Attached directly to Neural Engine</div>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-500/30">
                                            Ready for Mixed Test
                                        </span>
                                    </div>
                                )}

                                {/* Extract Loading */}
                                {isPreviewLoading && (
                                    <div className="flex items-center gap-3 text-sm text-blue-200 mt-2 bg-blue-900/20 p-3 rounded-lg border border-blue-800/30">
                                        <RefreshCw className="animate-spin" size={16} />
                                        Synthesizing Resource...
                                    </div>
                                )}

                                {/* Preview Errors */}
                                {previewError && (
                                    <div className="flex items-center gap-3 text-sm text-red-200 mt-2 bg-red-900/20 p-3 rounded-lg border border-red-800/30">
                                        <AlertTriangle size={16} className="text-red-400" />
                                        {previewError}
                                    </div>
                                )}
                            </div>

                            {/* Desktop Generate Button */}
                            <div className="hidden lg:block mt-2">
                                <button
                                    onClick={handleGenerateTest}
                                    disabled={isGeneratingTest || (!aiTopic.trim() && !uploadedResource)}
                                    className="w-full bg-white text-[#2278B0] py-3 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-3 hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
                                >
                                    {isGeneratingTest ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={20} />
                                            <span>Crafting your assessment...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={20} />
                                            <span>Generate Diagnostic Test</span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </div>

                        {/* Right Side: Config Panel */}
                        <div className="flex flex-col gap-5 md:gap-6 lg:h-full justify-start">
                            <ConfigPanel
                                questionCount={questionCount}
                                setQuestionCount={setQuestionCount}
                                difficulty={difficulty}
                                setDifficulty={setDifficulty}
                                pyqPercentage={pyqPercentage}
                                setPyqPercentage={setPyqPercentage}
                            />

                            {/* Mobile/Tablet Generate Button */}
                            <div className="lg:hidden mt-2">
                                <button
                                    onClick={handleGenerateTest}
                                    disabled={isGeneratingTest || (!aiTopic.trim() && !uploadedResource)}
                                    className="w-full bg-white text-[#2278B0] py-3 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-3 hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
                                >
                                    {isGeneratingTest ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={20} />
                                            <span>Crafting your assessment...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={20} />
                                            <span>Generate Diagnostic Test</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Enhanced Loading State - Fixed positioning */}
                        <div className="col-span-1 lg:col-span-2">
                            <LoadingState
                                isGenerating={isGeneratingTest}
                                progress={generationProgress}
                                topic={aiTopic}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Knowledge Graph & Protocols */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Knowledge Graph Section */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 flex flex-col shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Cpu size={20} className="text-[#2278B0]" /> Knowledge Graph
                        </h3>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            LIVE
                        </span>
                    </div>

                    <KnowledgeGraph mastery={userStats.topicMastery} />

                    {/* Weakness Spotlight */}
                    <div className="mt-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Weakness Spotlight
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(userStats.topicMastery)
                                .filter((item) => item[1] < 50)
                                .map(([t, s]) => (
                                    <div
                                        key={t}
                                        className="px-3 py-1.5 md:px-4 md:py-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 justify-start text-left w-auto max-w-full cursor-default"
                                    >
                                        <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                                        <div className="overflow-hidden text-left">
                                            <div className="text-xs md:text-sm font-bold text-slate-800 truncate max-w-[120px]">{t}</div>
                                            <div className="text-[10px] md:text-xs text-red-500 whitespace-nowrap">{s}% Mastery</div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Standard Protocols */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 flex flex-col shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Shield size={20} className="text-orange-500" /> Standard Protocols
                    </h3>
                    <div className="flex-1 flex flex-col gap-4">
                        {/* My Classroom - NEW */}
                        <div
                            className="p-4 bg-purple-50 rounded-xl border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => setView('student/classroom')}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-purple-800">My Classroom</span>
                                <span className="text-xs bg-white px-2 py-1 rounded text-purple-600 font-bold">
                                    <Building2 size={12} className="inline mr-1" />
                                    Batches
                                </span>
                            </div>
                            <p className="text-xs text-purple-600/80">
                                View assigned tests from your institution.
                            </p>
                        </div>


                        {/* Full Mock Test */}
                        <div
                            className="p-4 bg-orange-50 rounded-xl border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors"
                            onClick={() => startMission()}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-orange-800">Full Mock Test</span>
                                <span className="text-xs bg-white px-2 py-1 rounded text-orange-600 font-bold">
                                    100 Qs
                                </span>
                            </div>
                            <p className="text-xs text-orange-600/80">
                                Standard comprehensive diagnostic.
                            </p>
                        </div>

                        {/* Flashcard Blitz */}
                        <div
                            className="p-4 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => setView('flashcards')}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-blue-800">Flashcard Blitz</span>
                                <span className="text-xs bg-white px-2 py-1 rounded text-blue-600 font-bold">
                                    Rapid
                                </span>
                            </div>
                            <p className="text-xs text-blue-600/80">Quick recall session.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
