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
    Eye
} from 'lucide-react';
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
    const [showConfig, setShowConfig] = useState(false);

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
            setShowConfig(false);
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header with Stats */}
            <header className="relative flex items-start justify-between gap-4">
                <div className="pr-24 sm:pr-32 min-w-0 flex-1">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-950 tracking-tight mb-1 sm:mb-2">
                        Command Center
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium flex items-center gap-1.5 flex-wrap">
                        <span className="bg-[#2278B0]/10 text-[#2278B0] text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold">
                            PRO
                        </span>
                        <span>Welcome back, Scholar.</span>
                    </p>
                </div>

                {/* Streak Card — pinned top-right */}
                <div className="absolute top-0 right-0 bg-white w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 shrink-0">
                    <div className="p-1.5 bg-orange-50 rounded-xl">
                        <Flame size={18} className="text-orange-500" fill="currentColor" />
                    </div>
                    <div className="text-base sm:text-lg font-black text-orange-500 leading-none">
                        {userStats.streakDays}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                        Day Streak
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
                    <div className="flex flex-col gap-6 max-w-3xl relative">
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
                                onToggleConfig={() => setShowConfig(!showConfig)}
                                showConfig={showConfig}
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

                        {/* Extended Config Panel */}
                        <ConfigPanel
                            showConfig={showConfig}
                            questionCount={questionCount}
                            setQuestionCount={setQuestionCount}
                            difficulty={difficulty}
                            setDifficulty={setDifficulty}
                            pyqPercentage={pyqPercentage}
                            setPyqPercentage={setPyqPercentage}
                        />

                        {/* Generate Button */}
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

                        {/* Enhanced Loading State */}
                        <LoadingState
                            isGenerating={isGeneratingTest}
                            progress={generationProgress}
                            topic={aiTopic}
                        />
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

                        {/* Join Institution Test */}
                        <div
                            className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors"
                            onClick={() => setView('institution/join')}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-indigo-800">Join Test</span>
                                <span className="text-xs bg-white px-2 py-1 rounded text-indigo-600 font-bold">
                                    <Building2 size={12} className="inline mr-1" />
                                    School
                                </span>
                            </div>
                            <p className="text-xs text-indigo-600/80">
                                Enter code to join institution test.
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
