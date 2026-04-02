import React, { useState, useMemo, useRef, useEffect } from 'react';
import { History, Search, PlayCircle, X, Check, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import { ALL_PYQ_QUESTIONS } from '@/services/pyqService';
import { SUBJECT_CODES, TOPIC_CODES } from '@/constants/appConstants';
import { SubjectSelector } from '@/components/dashboard/SubjectSelector';

const currentYear = new Date().getFullYear();

const DURATION_OPTIONS = [
    { label: 'All Years', value: 'All' },
    { label: 'Last 3 Years', min: currentYear - 2, max: currentYear },
    { label: 'Last 5 Years', min: currentYear - 4, max: currentYear },
    { label: 'Last 10 Years', min: currentYear - 9, max: currentYear },
];

const SOURCE_OPTIONS = [
    { label: 'All UPSC Exams', value: 'All' },
    { label: 'Only UPSC CSE', value: 'Only UPSC CSE' },
    { label: 'NDA', value: 'NDA' },
    { label: 'CDSE', value: 'CDSE' },
    { label: 'CAPF', value: 'CAPF' },
    { label: 'CISF', value: 'CISF' },
];

const QUESTION_COUNT_OPTIONS = [
    { label: '25 Questions', value: 25 },
    { label: '50 Questions', value: 50 },
    { label: '100 Questions', value: 100 },
    { label: 'All Questions', value: 'All' },
];

// ── Reusable single-select dropdown ──────────────────────────────────────────
const Dropdown = ({ label, value, options, onChange, icon: Icon, align = 'bottom' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const isActive = value && value !== 'All';

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative w-full" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all whitespace-nowrap w-full min-w-[160px] ${isActive
                    ? 'bg-[#2278B0] text-white border-[#2278B0]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#2278B0]/40 hover:bg-slate-50'
                    }`}
            >
                {Icon && <Icon size={14} className="opacity-70 flex-shrink-0" />}
                <span className="flex-1 text-left truncate">{value || label}</span>
                {isActive && (
                    <span
                        onClick={(e) => { e.stopPropagation(); onChange('All'); setOpen(false); }}
                        className="p-0.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors flex-shrink-0"
                    >
                        <X size={10} />
                    </span>
                )}
                <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className={`absolute ${align === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-full z-50 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden animate-in fade-in ${align === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} duration-150`}>
                    <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {options.map(opt => {
                            const optVal = typeof opt === 'string' ? opt : opt.value;
                            const optLabel = typeof opt === 'string' ? opt : opt.label;
                            const isSelected = value === optVal || value === optLabel;
                            return (
                                <button
                                    key={optVal}
                                    onClick={() => { onChange(isSelected ? 'All' : (optVal || optLabel)); setOpen(false); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${isSelected
                                        ? 'bg-[#2278B0]/5 text-[#2278B0] font-bold'
                                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                                        }`}
                                >
                                    <span>{optLabel}</span>
                                    {isSelected && <Check size={14} className="text-[#2278B0]" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Multi-select dropdown for subtopics ──────────────────────────────────────
const MultiDropdown = ({ label, options, selected, onToggle }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isActive = !label.startsWith('All ');

    return (
        <div className="relative w-full" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all whitespace-nowrap w-full min-w-[160px] ${isActive
                    ? 'bg-[#2278B0] text-white border-[#2278B0]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#2278B0]/40 hover:bg-slate-50'
                    }`}
            >
                <span className="flex-1 text-left truncate">{label}</span>
                <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full mt-2 left-0 w-full z-50 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                        <span className="text-[10px] text-slate-400 font-medium">Multi-select</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {options.map(topic => {
                            const isChosen = selected.has(topic);
                            return (
                                <button
                                    key={topic}
                                    onClick={() => onToggle(topic)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isChosen
                                        ? 'bg-[#2278B0]/5 text-[#2278B0] font-bold'
                                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                                        }`}
                                >
                                    {isChosen
                                        ? <CheckCircle2 size={15} className="text-[#2278B0] flex-shrink-0" />
                                        : <Circle size={15} className="text-slate-300 flex-shrink-0" />
                                    }
                                    <span className="text-left">{topic}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────
const PYQView = ({ startCustomTest }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState(new Set(['All Subjects']));
    const [selectedSubtopics, setSelectedSubtopics] = useState(new Set(['All Subtopics']));
    const [selectedDuration, setSelectedDuration] = useState('All');
    const [selectedSource, setSelectedSource] = useState('All');
    const [selectedQuestionCount, setSelectedQuestionCount] = useState('All');

    // Bridge: SubjectSelector gives an array; PYQ filters work on a Set
    const handleSubjectsChange = (arr) => {
        setSelectedSubjects(new Set(arr));
        setSelectedSubtopics(new Set(['All Subtopics']));
    };

    // Derive subtopics from selected subjects using dashboard logic
    const subtopics = useMemo(() => {
        let codes = [];
        const subjectsArray = Array.from(selectedSubjects);
        if (!subjectsArray || subjectsArray.length === 0 || subjectsArray.includes('All Subjects')) {
            Object.values(TOPIC_CODES).forEach(topicsObj => {
                codes = [...codes, ...Object.values(topicsObj)];
            });
        } else {
            subjectsArray.forEach(sub => {
                const code = SUBJECT_CODES[sub];
                if (code && TOPIC_CODES[code]) {
                    codes = [...codes, ...Object.values(TOPIC_CODES[code])];
                }
            });
        }
        return [...new Set(codes)].sort();
    }, [selectedSubjects]);

    const activeDuration = DURATION_OPTIONS.find(o => o.label === selectedDuration) || null;

    const filteredQuestions = useMemo(() => {
        return ALL_PYQ_QUESTIONS.filter(q => {
            // Duration filter
            if (activeDuration && (q.year < activeDuration.min || q.year > activeDuration.max)) return false;

            // Subject filter
            if (!selectedSubjects.has('All Subjects') && selectedSubjects.size > 0) {
                if (!selectedSubjects.has(q.subject)) return false;
            }

            // Sub-topic filter
            if (!selectedSubtopics.has('All Subtopics') && selectedSubtopics.size > 0) {
                if (!selectedSubtopics.has(q.topic)) return false;
            }

            // Source filter
            if (selectedSource !== 'All') {
                if (selectedSource === 'Only UPSC CSE' && !q._isCSE) return false;
                else if (selectedSource !== 'Only UPSC CSE' && q._source !== selectedSource) return false;
            }

            // Search filter
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                if (!q.text?.toLowerCase().includes(s) && !q.topic?.toLowerCase().includes(s)) return false;
            }

            return true;
        });
    }, [selectedSubjects, selectedSubtopics, activeDuration, selectedSource, searchTerm]);

    const hasActiveFilters = searchTerm || (!selectedSubjects.has('All Subjects') && selectedSubjects.size > 0) || (!selectedSubtopics.has('All Subtopics') && selectedSubtopics.size > 0)
        || selectedDuration !== 'All' || selectedSource !== 'All' || selectedQuestionCount !== 'All';

    const clearAll = () => {
        setSearchTerm('');
        setSelectedSubjects(new Set(['All Subjects']));
        setSelectedSubtopics(new Set(['All Subtopics']));
        setSelectedDuration('All');
        setSelectedSource('All');
        setSelectedQuestionCount('All');
    };

    // Used only by active-filter tags to remove a single subject chip
    const toggleSubject = (sub) => {
        const next = new Set(selectedSubjects);
        if (sub === 'All Subjects') {
            setSelectedSubjects(new Set(['All Subjects']));
        } else {
            next.delete(sub);
            setSelectedSubjects(next.size === 0 ? new Set(['All Subjects']) : next);
        }
        setSelectedSubtopics(new Set(['All Subtopics']));
    };

    const toggleSubtopic = (topic) => {
        setSelectedSubtopics(prev => {
            const next = new Set(prev);
            if (topic === 'All Subtopics') {
                return new Set(['All Subtopics']);
            } else {
                next.delete('All Subtopics');
                if (next.has(topic)) {
                    next.delete(topic);
                    if (next.size === 0) return new Set(['All Subtopics']);
                } else {
                    next.add(topic);
                }
            }
            return next;
        });
    };

    const handleGenerateTest = () => {
        if (filteredQuestions.length === 0) return;
        const seenIds = new Set();
        const seenTexts = new Set();
        let uniqueQuestions = filteredQuestions.filter(q => {
            const textKey = (q.text || '').trim().toLowerCase().substring(0, 100);
            if (seenIds.has(q.id) || seenTexts.has(textKey)) return false;
            seenIds.add(q.id);
            if (textKey) seenTexts.add(textKey);
            return true;
        });

        // Apply question count limit with random selection
        if (selectedQuestionCount !== 'All' && typeof selectedQuestionCount === 'number' && uniqueQuestions.length > selectedQuestionCount) {
            const shuffled = [...uniqueQuestions].sort(() => Math.random() - 0.5);
            uniqueQuestions = shuffled.slice(0, selectedQuestionCount);
        }

        const countLabel = selectedQuestionCount !== 'All' ? `${uniqueQuestions.length}Q` : `${uniqueQuestions.length}Q`;
        const subLabel = selectedSubjects.size > 0 ? [...selectedSubjects].join(', ') : 'Mixed';
        const testTitle = `UPSC PYQs - ${subLabel} (${activeDuration?.label ?? 'All Years'}) - ${countLabel}`;
        if (startCustomTest) startCustomTest(uniqueQuestions, testTitle);
    };

    return (
        <div className="space-y-6 px-4 animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-2">
                    <span className="p-2 bg-[#2278B0]/10 rounded-xl">
                        <History size={22} className="text-[#2278B0]" />
                    </span>
                    UPSC PYQ Database
                </h1>
                <p className="text-slate-500 max-w-2xl text-sm leading-relaxed">
                    Master the UPSC examination by solving highly curated Prior Year Questions. Filter by year range, subjects, and topics to generate hyper-targeted practice tests.
                </p>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search questions or topics..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2278B0]/20 focus:border-[#2278B0]/40 transition-all font-medium text-slate-700 text-sm"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                            <X size={14} className="text-slate-500" />
                        </button>
                    )}
                </div>

                {/* Dropdowns row */}
                <div className="flex flex-col gap-4">

                    {/* 40 / 60 Filter Row */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                        {/* Subject — 40% (2/5) width */}
                        <div className="flex flex-col gap-1 md:col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Select Subject</span>
                            <SubjectSelector
                                className=""
                                onSelect={() => {}}
                                onSubjectsChange={handleSubjectsChange}
                            />
                        </div>

                        {/* Subtopic — 60% (3/5) width */}
                        <div className="flex flex-col gap-1 md:col-span-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Select Sub-Topics</span>
                            <MultiDropdown
                                label={
                                    selectedSubtopics.has('All Subtopics')
                                        ? 'All Sub-topics'
                                        : (selectedSubtopics.size === 1 ? [...selectedSubtopics][0] : `${selectedSubtopics.size} Sub-topics`)
                                }
                                options={['All Subtopics', ...subtopics]}
                                selected={selectedSubtopics}
                                onToggle={toggleSubtopic}
                            />
                        </div>
                    </div>

                    {/* Secondary Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 w-full items-end">
                        {/* Duration */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Duration</span>
                            <Dropdown
                                label="All Years"
                                value={selectedDuration}
                                options={DURATION_OPTIONS}
                                onChange={setSelectedDuration}
                            />
                        </div>

                        {/* Source */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Source</span>
                            <Dropdown
                                label="All UPSC Exams"
                                value={selectedSource}
                                options={SOURCE_OPTIONS}
                                onChange={setSelectedSource}
                            />
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex justify-end mt-1">
                            <button
                                onClick={clearAll}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                            >
                                <X size={12} /> Clear Filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Active filter tags */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                        {[...selectedSubjects].map(sub => (
                            <span key={sub} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2278B0]/5 text-[#2278B0] text-xs font-bold rounded-full border border-[#2278B0]/20">
                                📚 {sub}
                                <button onClick={() => toggleSubject(sub)}><X size={10} /></button>
                            </span>
                        ))}
                        {[...selectedSubtopics].map(t => (
                            <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                                🏷 {t}
                                <button onClick={() => toggleSubtopic(t)}><X size={10} /></button>
                            </span>
                        ))}
                        {selectedDuration !== 'Year' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2278B0]/5 text-[#2278B0] text-xs font-bold rounded-full border border-[#2278B0]/20">
                                📅 {selectedDuration}
                                <button onClick={() => setSelectedDuration('All')}><X size={10} /></button>
                            </span>
                        )}
                        {selectedSource !== 'Source' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                                🎓 {selectedSource}
                                <button onClick={() => setSelectedSource('All')}><X size={10} /></button>
                            </span>
                        )}
                        {searchTerm && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
                                🔍 "{searchTerm}"
                                <button onClick={() => setSearchTerm('')}><X size={10} /></button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Results Header & Generate Action */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-indigo-950 p-6 md:p-8 rounded-3xl shadow-lg relative text-white">
                <div className="text-left sm:text-left z-10">
                    <p className="text-white/60 text-xs font-bold mb-1">
                        {filteredQuestions.length} questions available
                        {selectedQuestionCount !== 'All' ? ` · ${selectedQuestionCount} will be selected` : ''}
                    </p>
                    <h1 className="text-xl md:text-2xl font-black md:leading-tight">
                        Ready to test your knowledge against the official UPSC standard?
                    </h1>
                </div>
                <div className="z-10 w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full sm:w-48">
                        <Dropdown
                            label="All Questions"
                            align="top"
                            value={selectedQuestionCount === 'All' ? 'All' : `${selectedQuestionCount} Questions`}
                            options={QUESTION_COUNT_OPTIONS}
                            onChange={(val) => {
                                if (val === 'All') setSelectedQuestionCount('All');
                                else {
                                    const opt = QUESTION_COUNT_OPTIONS.find(o => o.label === val || o.value === val);
                                    setSelectedQuestionCount(opt ? opt.value : 'All');
                                }
                            }}
                        />
                    </div>
                    <button
                        onClick={handleGenerateTest}
                        disabled={filteredQuestions.length === 0}
                        className="w-full sm:w-auto bg-white text-indigo-950 px-8 py-4 rounded-xl font-black flex items-center justify-center gap-3 hover:-translate-y-1 hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:-translate-y-0 disabled:shadow-none whitespace-nowrap"
                    >
                        <PlayCircle size={20} />
                        Generate PYQ Test
                    </button>
                </div>
            </div>

        </div>
    );
};

export default PYQView;
