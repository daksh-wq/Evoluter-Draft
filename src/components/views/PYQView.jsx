import React, { useState, useMemo } from 'react';
import { History, Search, Filter, PlayCircle, BookOpen } from 'lucide-react';
import { PYQ_DATABASE } from '@/constants/pyqDatabase';

const PYQView = ({ startCustomTest }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('All');
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [selectedTopic, setSelectedTopic] = useState('All');

    // Extract unique filter options
    const years = useMemo(() => ['All', ...new Set(PYQ_DATABASE.map(q => q.year))].sort((a, b) => b - a), []);
    const subjects = useMemo(() => ['All', ...new Set(PYQ_DATABASE.map(q => q.subject))].sort(), []);

    // Topics depend on the selected subject (if any)
    const topics = useMemo(() => {
        let filtered = PYQ_DATABASE;
        if (selectedSubject !== 'All') {
            filtered = PYQ_DATABASE.filter(q => q.subject === selectedSubject);
        }
        return ['All', ...new Set(filtered.map(q => q.topic))].sort();
    }, [selectedSubject]);

    // Apply all filters
    const filteredQuestions = useMemo(() => {
        return PYQ_DATABASE.filter(q => {
            const matchesYear = selectedYear === 'All' || q.year.toString() === selectedYear.toString();
            const matchesSubject = selectedSubject === 'All' || q.subject === selectedSubject;
            const matchesTopic = selectedTopic === 'All' || q.topic === selectedTopic;
            const matchesSearch = searchTerm === '' ||
                q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.topic.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesYear && matchesSubject && matchesTopic && matchesSearch;
        });
    }, [selectedYear, selectedSubject, selectedTopic, searchTerm]);

    const handleGenerateTest = () => {
        if (filteredQuestions.length === 0) return;

        // CRITICAL: Deduplicate by ID + text to ensure no question ever repeats
        const seenIds = new Set();
        const seenTexts = new Set();
        const uniqueQuestions = filteredQuestions.filter(q => {
            const textKey = (q.text || '').trim().toLowerCase().substring(0, 100);
            if (seenIds.has(q.id) || seenTexts.has(textKey)) return false;
            seenIds.add(q.id);
            if (textKey) seenTexts.add(textKey);
            return true;
        });

        const testTitle = `UPSC PYQs - ${selectedSubject !== 'All' ? selectedSubject : 'Mixed'} (${selectedYear !== 'All' ? selectedYear : 'All Years'})`;
        if (startCustomTest) {
            startCustomTest(uniqueQuestions, testTitle);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <History size={28} className="text-[#2278B0]" />
                            UPSC PYQ Database
                        </h1>
                        <p className="text-slate-500 mt-2 max-w-2xl">
                            Master the UPSC examination by solving highly curated Prior Year Questions from 2000 till date. Filter by specific subjects, topics, and years to generate hyper-targeted practice tests.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                {/* Search */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search questions or topics..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2278B0]/20 transition-all font-medium text-slate-700"
                    />
                </div>

                {/* Selectors */}
                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2278B0]/20 min-w-[100px]"
                    >
                        {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>)}
                    </select>

                    <select
                        value={selectedSubject}
                        onChange={(e) => {
                            setSelectedSubject(e.target.value);
                            setSelectedTopic('All'); // Reset topic when subject changes
                        }}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2278B0]/20 min-w-[140px]"
                    >
                        {subjects.map(s => <option key={s} value={s}>{s === 'All' ? 'All Subjects' : s}</option>)}
                    </select>

                    <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2278B0]/20 min-w-[140px]"
                    >
                        {topics.map(t => <option key={t} value={t}>{t === 'All' ? 'All Topics' : t}</option>)}
                    </select>
                </div>

                {/* Reset Filters */}
                {(searchTerm || selectedYear !== 'All' || selectedSubject !== 'All' || selectedTopic !== 'All') && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedYear('All');
                            setSelectedSubject('All');
                            setSelectedTopic('All');
                        }}
                        className="px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors whitespace-nowrap"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Results Header & Generate Action */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-indigo-950 p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden text-white">
                <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
                    <History size={150} />
                </div>

                <div className="z-10 text-center sm:text-left">
                    <h2 className="text-xl md:text-2xl font-bold mb-1">
                        Found {filteredQuestions.length} Questions
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

            {/* Questions Preview List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2 px-2">
                    <Filter size={18} /> Question Bank Preview
                </h3>

                {filteredQuestions.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredQuestions.slice(0, 50).map((q, idx) => (
                            <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#2278B0]/30 transition-colors shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#2278B0] opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex items-center gap-2 mb-3">
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-amber-200 tracking-wider">
                                        UPSC {q.year}
                                    </span>
                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
                                        {q.subject}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400 capitalize truncate">
                                        {q.topic}
                                    </span>
                                </div>

                                <p className="text-slate-800 font-medium text-sm leading-relaxed mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">
                                    {q.text}
                                </p>

                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                    {q.options.map((opt, i) => (
                                        <div key={i} className={`text-xs p-2 rounded-lg border ${i === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'} truncate`}>
                                            <span className="opacity-50 mr-1">{String.fromCharCode(65 + i)}.</span> {opt}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">No Records Found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            Try adjusting your filters or search terms. We are continuously adding more historical questions.
                        </p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default PYQView;
