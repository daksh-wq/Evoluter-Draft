import React, { useState, useMemo, useRef, useEffect } from 'react';
import { History, Search, Filter, PlayCircle, BookOpen, ChevronDown, X, Check } from 'lucide-react';
import { PYQ_DATABASE } from '@/constants/pyqDatabase';

const currentYear = new Date().getFullYear();
const YEAR_RANGES = [
    { label: 'All Years (2015+)', value: 'All', min: 2015, max: currentYear },
    { label: 'Last 3 Years', min: currentYear - 2, max: currentYear },
    { label: 'Last 5 Years', min: currentYear - 4, max: currentYear },
    { label: 'Last 10 Years', min: Math.max(2015, currentYear - 9), max: currentYear }
];

import { CustomDropdown } from '../common';

// ── Year range dropdown ───────────────────────────────────────────
const YearRangeDropdown = ({ selected, onSelect }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const activeRange = YEAR_RANGES.find(r => r.label === selected) || YEAR_RANGES[0];
    const isActive = selected !== 'All Years (2015+)';

    return (
        <div className="relative w-full sm:w-auto" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all whitespace-nowrap w-full sm:w-auto ${
                    isActive
                        ? 'bg-[#2278B0] text-white border-[#2278B0]'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-[#2278B0]/40 hover:bg-slate-50'
                }`}
            >
                <History size={14} className="opacity-70" />
                <span>{activeRange.label}</span>
                {isActive && (
                    <span
                        onClick={(e) => { e.stopPropagation(); onSelect('All Years (2015+)'); setOpen(false); }}
                        className="ml-1 p-0.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                    >
                        <X size={10} />
                    </span>
                )}
                <ChevronDown size={14} className={`ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-md min-w-[200px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Year Range</p>
                    </div>
                    {YEAR_RANGES.map(range => (
                        <button
                            key={range.label}
                            onClick={() => { onSelect(range.label); setOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                                activeRange.label === range.label
                                    ? 'bg-[#2278B0]/5 text-[#2278B0] font-bold'
                                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                            }`}
                        >
                            <span>{range.label}</span>
                            {activeRange.label === range.label && <Check size={14} className="text-[#2278B0]" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────
const PYQView = ({ startCustomTest }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYearRange, setSelectedYearRange] = useState('All Years (2015+)');
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [selectedTopic, setSelectedTopic] = useState('All');

    const subjects = useMemo(() => ['All', ...new Set(PYQ_DATABASE.map(q => q.subject))].sort(), []);

    const topics = useMemo(() => {
        let filtered = PYQ_DATABASE;
        if (selectedSubject !== 'All') filtered = PYQ_DATABASE.filter(q => q.subject === selectedSubject);
        return ['All', ...new Set(filtered.map(q => q.topic))].sort();
    }, [selectedSubject]);

    const filteredQuestions = useMemo(() => {
        const range = YEAR_RANGES.find(r => r.label === selectedYearRange);
        return PYQ_DATABASE.filter(q => {
            const matchesYear = !range || range.value === 'All'
                ? true
                : q.year >= range.min && q.year <= range.max;
            const matchesSubject = selectedSubject === 'All' || q.subject === selectedSubject;
            const matchesTopic = selectedTopic === 'All' || q.topic === selectedTopic;
            const matchesSearch = searchTerm === '' ||
                q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.topic.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesYear && matchesSubject && matchesTopic && matchesSearch;
        });
    }, [selectedYearRange, selectedSubject, selectedTopic, searchTerm]);

    const [visibleCount, setVisibleCount] = useState(10);
    const hasActiveFilters = searchTerm || selectedYearRange !== 'All Years (2015+)' || selectedSubject !== 'All' || selectedTopic !== 'All';

    const clearAll = () => {
        setSearchTerm('');
        setSelectedYearRange('All Years (2015+)');
        setSelectedSubject('All');
        setSelectedTopic('All');
        setVisibleCount(10);
    };

    const handleGenerateTest = () => {
        if (filteredQuestions.length === 0) return;
        const seenIds = new Set();
        const seenTexts = new Set();
        const uniqueQuestions = filteredQuestions.filter(q => {
            const textKey = (q.text || '').trim().toLowerCase().substring(0, 100);
            if (seenIds.has(q.id) || seenTexts.has(textKey)) return false;
            seenIds.add(q.id);
            if (textKey) seenTexts.add(textKey);
            return true;
        });
        const testTitle = `UPSC PYQs - ${selectedSubject !== 'All' ? selectedSubject : 'Mixed'} (${selectedYearRange !== 'All Years (2015+)' ? selectedYearRange : 'All Years'})`;
        if (startCustomTest) startCustomTest(uniqueQuestions, testTitle);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
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

                {/* Filter Chips Row */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center">
                    {/* <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mr-1 hidden sm:flex">
                        <Filter size={11} /> Filters
                    </span> */}

                    <YearRangeDropdown
                        selected={selectedYearRange}
                        onSelect={setSelectedYearRange}
                    />

                    <CustomDropdown
                        label="All Subjects"
                        options={subjects}
                        value={selectedSubject}
                        onChange={(val) => { setSelectedSubject(val); setSelectedTopic('All'); }}
                        initialShowCount={8}
                        isFilter={true}
                        className="w-full sm:w-auto"
                    />

                    <CustomDropdown
                        label="All Topics"
                        options={topics}
                        value={selectedTopic}
                        onChange={setSelectedTopic}
                        initialShowCount={6}
                        isFilter={true}
                        className="w-full sm:w-auto"
                    />

                    {hasActiveFilters && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                        >
                            <X size={12} /> Clear All
                        </button>
                    )}
                </div>

                {/* Active filter tags */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                        {selectedYearRange !== 'All Years (2015+)' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2278B0]/5 text-[#2278B0] text-xs font-bold rounded-full border border-[#2278B0]/20">
                                📅 {selectedYearRange}
                                <button onClick={() => setSelectedYearRange('All Years (2015+)')}><X size={10} /></button>
                            </span>
                        )}
                        {selectedSubject !== 'All' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                                📚 {selectedSubject}
                                <button onClick={() => { setSelectedSubject('All'); setSelectedTopic('All'); }}><X size={10} /></button>
                            </span>
                        )}
                        {selectedTopic !== 'All' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                                🏷 {selectedTopic}
                                <button onClick={() => setSelectedTopic('All')}><X size={10} /></button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Results Header & Generate Action */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-indigo-950 p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden text-white">
                <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
                    <History size={150} />
                </div>
                <div className="z-10 text-center sm:text-left">
                    <h2 className="text-xl md:text-2xl font-bold mb-1">
                        Found {filteredQuestions.length.toLocaleString()} Questions
                    </h2>
                    <p className="text-indigo-200 text-sm">
                        Ready to test your knowledge against the official UPSC standard?
                    </p>
                </div>
                <div className="z-10 w-full sm:w-auto">
                    <button
                        onClick={handleGenerateTest}
                        disabled={filteredQuestions.length === 0}
                        className="w-full sm:w-auto bg-white text-indigo-950 px-8 py-4 rounded-xl font-black flex items-center justify-center gap-3 hover:-translate-y-1 hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:-translate-y-0 disabled:shadow-none"
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
