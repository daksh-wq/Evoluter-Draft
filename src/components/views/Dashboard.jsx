import React, { useState, useCallback, useMemo } from 'react';
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
    Bell,
    UserCheck
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { KnowledgeGraph } from '../common';
import { SubjectSelector } from '../dashboard/SubjectSelector';
import { ChapterSelector } from '../dashboard/ChapterSelector';
import { ConfigPanel } from '../dashboard/ConfigPanel';
import { LoadingState } from '../dashboard/LoadingState';
import { DEFAULT_QUESTION_COUNT, DEFAULT_DIFFICULTY } from '../../constants/appConstants';
import { useDailyWisdom } from '../../hooks/useDailyWisdom';
import { useExamDate } from '../../hooks/useExamDate';
import { useNotifications } from '../../hooks/useNotifications';
import { CHAPTERS_LIST, SUBTOPICS_LIST } from '../../constants/subjectChapterData';
import { extractTextFromPDF } from '../../utils/pdfExtractor';
import { batchService } from '../../features/exam-engine/services/batchService';

// Fix #9: computed once at module load, not on every render
const CURRENT_YEAR = new Date().getFullYear();

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
    const [selectedSubtopic, setSelectedSubtopic] = useState(''); // separate from chapter
    const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
    const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
    const [pyqPercentage, setPyqPercentage] = useState(0);
    const [selectedSubjects, setSelectedSubjects] = useState([]); // Track subject picker state

    // Live Test Notifications State
    const { notifications, markAsViewed } = useNotifications(userData);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationsRef = React.useRef(null);
    const unreadCount = notifications.filter(n => !n.isViewed).length;

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

    // Fix #9: module-level constant avoids re-computing on every render
    const effectiveYear = (userData?.targetYear && userData.targetYear >= CURRENT_YEAR)
        ? userData.targetYear
        : CURRENT_YEAR;

    const { examDate, daysRemaining, isOfficial, loading: dateLoading } = useExamDate(userData?.targetExam, effectiveYear);

    const handleGenerateTest = useCallback(() => {
        if (aiTopic.trim() || uploadedResource) {
            // Build topic: "Chapter > Subtopic" if a subtopic is selected, else just chapter
            const baseChapter = aiTopic.trim();
            const finalTopic = uploadedResource
                ? `Test from ${resourceName}`
                : selectedSubtopic
                    ? `${baseChapter} > ${selectedSubtopic}`
                    : baseChapter;
            generateAITest(finalTopic, questionCount, difficulty, uploadedResource, pyqPercentage);
            // Only reset resource / upload fields — keep chapter + subtopic selection intact
            setUploadedResource('');
            setPreviewQuestions([]);
            setResourceName('');
            setPyqPercentage(0);
        }
    }, [aiTopic, selectedSubtopic, uploadedResource, resourceName, questionCount, difficulty, pyqPercentage, generateAITest]);

    // Fix #6: stable handler shared by all three notification item types
    const handleGoToClassroom = useCallback(() => {
        setShowNotifications(false);
        setView('student/classroom');
    }, [setView]);

    const handleNotificationClick = useCallback((itemId) => {
        markAsViewed(itemId);
        setShowNotifications(false);
        setView('student/classroom');
    }, [setView, markAsViewed]);

    // Fix #8: only recomputed when topicMastery reference changes
    const weakTopics = useMemo(
        () => Object.entries(userStats.topicMastery).filter(([, s]) => s < 50),
        [userStats.topicMastery]
    );

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

    // Auto-show suggestions when subjects are selected (no typing or focus needed)
    // Fix #7: aiTopic is read inside so it must be in the dependency array
    React.useEffect(() => {
        if (selectedSubjects.length > 0) {
            setShowSuggestions(true);
        } else if (!aiTopic.trim()) {
            // Clear suggestions if no subjects selected and no typed topic
            setTopicSuggestions([]);
            setShowSuggestions(false);
        }
    }, [selectedSubjects, aiTopic]);

    // Manual Subtopic Mapping Effect
    React.useEffect(() => {
        const keyword = aiTopic.trim();
        // Use typed keyword OR selected subjects as the seed
        const effectiveKeyword = keyword || (selectedSubjects.length > 0 ? selectedSubjects.join(' ') : '');

        if (!effectiveKeyword || effectiveKeyword.length < 2) {
            setTopicSuggestions([]);
            return;
        }

        // Fetch from manual mapping
        // effectiveKeyword will normally be the chapter string right out of ChapterSelector
        const chapterObj = CHAPTERS_LIST.find(c => c.name.toLowerCase() === effectiveKeyword.toLowerCase());
        if (chapterObj) {
            const subs = SUBTOPICS_LIST.filter(s => s.chapterId === chapterObj.id).map(s => s.name);
            setTopicSuggestions(subs);
        } else {
            setTopicSuggestions([]);
        }
    }, [aiTopic, selectedSubjects]);



    return (
        <div className="space-y-4 px-4 pt-2 animate-in fade-in duration-500 pb-20">
            {/* Target Exam Card - Full Width */}
            <div className="w-full bg-indigo-950 text-white rounded-3xl shadow-lg relative overflow-visible flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-8 min-h-[140px] gap-2 sm:gap-4">

                {/* Left: Exam Info */}
                <div className="z-10 flex-1 min-w-0 mb-4 sm:mb-0">
                    <div className="text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1.5">
                        Target Exam
                    </div>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-loose sm:leading-none break-words">
                        {userData?.targetExam || 'UPSC CSE'} {effectiveYear}
                    </h3>
                </div>

                {/* Right: Stat Cards aligned to the right edge */}
                <div className="z-20 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 shrink-0 justify-start sm:justify-end">
                    {/* Notification Bell */}
                    <div className="relative" ref={notificationsRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} new)` : ''}`}
                            aria-expanded={showNotifications}
                            aria-haspopup="listbox"
                            className={`h-[68px] w-[68px] sm:h-20 sm:w-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all outline-none bg-white/10 border border-white/15 hover:bg-white/20 ${showNotifications ? 'ring-2 ring-white/30' : ''}`}
                        >
                            <Bell size={20} className="text-white/80" />
                            <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest">Alerts</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md ring-2 ring-indigo-950">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Dropdown */}
                        {showNotifications && (
                            <div className="absolute -left-12 sm:left-auto sm:right-0 mt-3 w-[300px] sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 text-slate-800">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-slate-800">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-full">
                                            {unreadCount} New
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
                                            {/* Fix #13: replaced <div onClick> with <button> for keyboard + screen reader accessibility */}
                                            {notifications.map(item => {
                                                if (item.type === 'batch') {
                                                    const batch = item.data;
                                                    return (
                                                        <button key={item.id} type="button" onClick={() => handleNotificationClick(item.id)}
                                                            className={`p-3 rounded-xl cursor-pointer transition-colors group flex gap-3 items-start border-b w-full text-left ${item.isViewed ? 'hover:bg-slate-50 border-slate-50 opacity-60' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'}`}>
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Building2 size={14} /></div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800 line-clamp-1">Joined Batch {batch.name}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">You have been added to the batch <span className="font-semibold">{batch.name}</span>.</div>
                                                            </div>
                                                        </button>
                                                    );
                                                } else if (item.type === 'test') {
                                                    const test = item.data;
                                                    return (
                                                        <button key={item.id} type="button" onClick={() => handleNotificationClick(item.id)}
                                                            className={`p-3 rounded-xl cursor-pointer transition-colors group flex gap-3 items-start border-b w-full text-left ${item.isViewed ? 'hover:bg-slate-50 border-slate-50 opacity-60' : 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-50'}`}>
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><FileTextIcon size={14} /></div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800 line-clamp-1">{test.title}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">is Live!</div>
                                                                <div className="text-[10px] text-indigo-600 font-bold mt-1.5 uppercase tracking-wide">Tap to view in Classroom</div>
                                                            </div>
                                                        </button>
                                                    );
                                                } else if (item.type === 'institution') {
                                                    const inst = item.data;
                                                    return (
                                                        <button key={item.id} type="button" onClick={() => handleNotificationClick(item.id)}
                                                            className={`p-3 rounded-xl cursor-pointer transition-colors group flex gap-3 items-start border-b w-full text-left ${item.isViewed ? 'hover:bg-slate-50 border-slate-50 opacity-60' : 'bg-blue-50/50 hover:bg-blue-50 border-blue-50'}`}>
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors"><UserCheck size={14} /></div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800 line-clamp-1">Joined Institution: {inst.name}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">You have been exclusively invited and added to <span className="font-semibold">{inst.name}</span>.</div>
                                                            </div>
                                                        </button>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                </div>
                                {notifications.length > 0 && (
                                    <button type="button" className="p-3 border-t border-slate-100 bg-slate-50 text-center hover:bg-slate-100 transition-colors cursor-pointer w-full"
                                        onClick={() => { setShowNotifications(false); setView('notifications'); }}>
                                        <span className="text-xs font-bold text-indigo-600">Show More</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Streak */}
                    <div className="h-[68px] w-[68px] sm:h-20 sm:w-20 rounded-2xl bg-white/10 border border-white/15 flex flex-col items-center justify-center gap-1.5 hover:bg-white/20 transition-all cursor-default">
                        <div className={`text-xl sm:text-2xl font-black leading-none ${userStats.streakDays > 0 ? 'text-orange-400' : 'text-white/30'}`}>
                            {userStats.streakDays}
                        </div>
                        <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest">Streak</span>
                    </div>

                    {/* Days Remaining */}
                    <div className="h-[68px] w-[84px] sm:h-20 sm:w-24 rounded-2xl bg-white/10 border border-white/15 flex flex-col items-center justify-center gap-1.5 hover:bg-white/20 transition-all cursor-default">
                        {dateLoading ? (
                            <div className="w-10 h-6 bg-white/10 rounded animate-pulse" />
                        ) : (
                            <div className="text-xl sm:text-2xl font-black leading-none text-blue-300">
                                {daysRemaining}
                            </div>
                        )}
                        <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest">Days Left</span>
                    </div>
                </div>
            </div>

            {/* Daily Quote Card */}
            <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#2278B0]/5 rounded-full blur-2xl pointer-events-none" />
                <h4 className="text-[#2278B0] font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Sparkles size={16} /> Today's Quote
                </h4>
                {quoteLoading ? (
                    <div className="space-y-3 mt-2">
                        <div className="h-4 bg-slate-200 rounded animate-pulse w-full"></div>
                        <div className="h-4 bg-slate-200 rounded animate-pulse w-4/5"></div>
                    </div>
                ) : (
                    <p className="text-base md:text-xl font-serif text-slate-800 italic leading-relaxed transition-opacity duration-500 max-w-4xl">
                        {quote}
                    </p>
                )}
            </div>
            {/* AI Neural Engine Section */}
            <div className="rounded-3xl bg-indigo-950 p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-900/20">
                <div className="relative z-10">
                    <h2 className="text-xl md:text-2xl font-bold mb-1">Generate Custom  Test</h2>
                    <p className="text-blue-100 max-w-6xl text-sm leading-relaxed mb-4">
                        Choose your subject or define a focused topic to create a comprehensive test experience that helps you assess your strengths, identify gaps, and refine your exam strategy.
                    </p>

                    {/* Controls Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-4 xl:gap-6 max-w-6xl relative pt-4">
                        {/* Left Side: Primary Inputs */}
                        <div className="flex flex-col gap-3">
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
                                <SubjectSelector
                                    onSelect={setAiTopic}
                                    onSubjectsChange={setSelectedSubjects}
                                    disabled={isGeneratingTest}
                                />

                                <ChapterSelector
                                    selectedSubjects={selectedSubjects}
                                    value={aiTopic}
                                    onChange={(val) => {
                                        setShowSuggestions(true);
                                        setAiTopic(val);
                                    }}
                                    disabled={isGeneratingTest}
                                />
                            </div>

                            {/* AI Suggestions Tags Here Below the Grid */}
                            {showSuggestions && aiTopic.length >= 2 && (
                                <div className="w-full animate-in fade-in slide-in-from-top-1">
                                    {isSuggesting ? (
                                        <div className="text-xs text-blue-200 flex items-center gap-1.5 px-2 font-medium">
                                            <div className="animate-spin w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full" />
                                            Neural Engine analyzing...
                                        </div>
                                    ) : topicSuggestions?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                        {topicSuggestions.map((suggestion) => {
                                                const isActiveSub = selectedSubtopic === suggestion;
                                                return (
                                                <button
                                                    key={suggestion}
                                                    type="button"
                                                    disabled={isGeneratingTest}
                                                    onClick={() => {
                                                        if (isGeneratingTest) return;
                                                        setSelectedSubtopic(prev => prev === suggestion ? '' : suggestion);
                                                    }}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 shadow-sm border ${
                                                        isGeneratingTest
                                                            ? 'opacity-50 cursor-not-allowed pointer-events-none ' + (isActiveSub ? 'bg-blue-500 border-blue-400 text-white' : 'text-white bg-white/10 border-white/20')
                                                            : isActiveSub
                                                                ? 'bg-blue-500 border-blue-400 text-white cursor-pointer'
                                                                : 'text-white bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/30 cursor-pointer'
                                                    }`}
                                                >
                                                    <Sparkles size={10} className={isActiveSub ? 'text-white' : 'text-blue-300 opacity-70'} />
                                                    {suggestion}
                                                </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* Resource Upload Section */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-blue-200 uppercase tracking-wider">
                                        Attach Resource (Optional)
                                    </span>
                                    {resourceType && (
                                        <button
                                            aria-label="Clear attached resource"
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
                                            disabled={isPreviewLoading || isGeneratingTest}
                                            className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl py-3 px-4 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            <span>Generate Test</span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </div>

                        {/* Right Side: Config Panel */}
                        <div className="flex flex-col h-full">
                            <ConfigPanel
                                questionCount={questionCount}
                                setQuestionCount={setQuestionCount}
                                difficulty={difficulty}
                                setDifficulty={setDifficulty}
                                pyqPercentage={pyqPercentage}
                                setPyqPercentage={setPyqPercentage}
                                disabled={isGeneratingTest}
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
                                subtopic={selectedSubtopic}
                                difficulty={difficulty}
                                questionCount={questionCount}
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
                        {/* Fix #8: memoized — only recomputed when topicMastery changes */}
                        <div className="flex flex-wrap gap-2">
                            {weakTopics.map(([t, s]) => (
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
