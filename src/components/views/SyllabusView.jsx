import React, { useState } from 'react';
import { SUBJECTS_LIST, CHAPTERS_LIST, SUBTOPICS_LIST } from '../../constants/subjectChapterData';
import { Target, ArrowLeft, BookOpen, FileText, ChevronRight, Layers } from 'lucide-react';

const SyllabusView = () => {
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [selectedChapterId, setSelectedChapterId] = useState(null);

    const selectedSubject = selectedSubjectId
        ? SUBJECTS_LIST.find(s => s.id === selectedSubjectId)
        : null;

    const selectedChapter = selectedChapterId
        ? CHAPTERS_LIST.find(c => c.id === selectedChapterId)
        : null;

    const activeChapters = selectedSubjectId
        ? CHAPTERS_LIST.filter(c =>
            String(c.subjectId).trim().toLowerCase() === String(selectedSubjectId).trim().toLowerCase()
          )
        : [];

    const activeSubtopics = selectedChapterId
        ? SUBTOPICS_LIST.filter(s =>
            String(s.chapterId).trim().toLowerCase() === String(selectedChapterId).trim().toLowerCase()
          )
        : [];

    const handleSubjectClick = (subjectId) => {
        setSelectedSubjectId(subjectId);
        // Auto-select the first chapter when entering a subject
        const firstChapter = CHAPTERS_LIST.find(c =>
            String(c.subjectId).trim().toLowerCase() === String(subjectId).trim().toLowerCase()
        );
        setSelectedChapterId(firstChapter?.id || null);
    };

    const goBack = () => {
        setSelectedSubjectId(null);
        setSelectedChapterId(null);
    };

    return (
        <div className={`max-w-7xl mx-auto animate-in fade-in duration-500 ${selectedSubjectId ? 'h-screen flex flex-col overflow-hidden px-4' : 'px-4 pt-4 pb-20'}`}>

            {/* ── Header ── */}
            <div className={`z-20 bg-white border-b border-slate-200 pb-4 pt-4 flex items-center gap-3 shrink-0 ${selectedSubjectId ? '' : 'sticky top-0 mb-8'}`}>
                {selectedSubjectId && (
                    <button
                        onClick={goBack}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                        title="Back to Subjects"
                    >
                        <ArrowLeft size={22} className="text-slate-600" />
                    </button>
                )}
                <div>
                    <h1 className="text-3xl font-black text-indigo-950 tracking-tight flex items-center gap-3">
                        <Target className="text-indigo-600" size={32} />
                        Syllabus Tracker
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">
                        {selectedSubject
                            ? `${selectedSubject.name} — ${activeChapters.length} Chapters`
                            : 'Explore subjects and track your coverage of the syllabus.'}
                    </p>
                </div>
            </div>

            {/* ── Level 1: Subjects Grid ── */}
            {!selectedSubjectId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {SUBJECTS_LIST.map((subject) => {
                        const chaptersCount = CHAPTERS_LIST.filter(c =>
                            String(c.subjectId).trim().toLowerCase() === String(subject.id).trim().toLowerCase()
                        ).length;
                        return (
                            <div
                                key={subject.id}
                                onClick={() => handleSubjectClick(subject.id)}
                                className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all hover:-translate-y-1 group"
                            >
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <BookOpen size={24} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-2">{subject.name}</h3>
                                <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                    {chaptersCount} Chapters
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Level 2 + 3: Split Panel ── */}
            {selectedSubjectId && (
                <div className="flex gap-6 flex-1 min-h-0 py-4">

                    {/* LEFT: Scrollable Chapter List */}
                    <div className="w-64 shrink-0 flex flex-col h-full">
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Chapters</p>
                            </div>
                            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                                {activeChapters.length === 0 ? (
                                    <p className="p-4 text-sm text-slate-400 italic">No chapters found.</p>
                                ) : (
                                    activeChapters.map((chapter) => {
                                        const count = SUBTOPICS_LIST.filter(s =>
                                            String(s.chapterId).trim().toLowerCase() === String(chapter.id).trim().toLowerCase()
                                        ).length;
                                        const isActive = selectedChapterId === chapter.id;
                                        return (
                                            <button
                                                key={chapter.id}
                                                onClick={() => setSelectedChapterId(chapter.id)}
                                                className={`w-full text-left px-4 py-3.5 flex items-center justify-between gap-2 transition-colors ${
                                                    isActive
                                                        ? 'bg-indigo-50 border-l-4 border-indigo-500'
                                                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-bold truncate ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                        {chapter.name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                        {count} subtopics
                                                    </p>
                                                </div>
                                                <ChevronRight
                                                    size={14}
                                                    className={`shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-300'}`}
                                                />
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Subtopics Panel */}
                    <div className="flex-1 min-w-0 flex flex-col h-full">
                        {!selectedChapterId ? (
                            <div className="flex flex-col items-center justify-center h-full bg-white border border-dashed border-slate-300 rounded-2xl text-center">
                                <Layers size={32} className="text-slate-300 mb-3" />
                                <p className="text-slate-400 font-medium text-sm">Select a chapter to view its subtopics</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                                {/* Panel Header */}
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-800">{selectedChapter?.name}</h3>
                                        <p className="text-xs font-medium text-slate-500">{activeSubtopics.length} subtopics</p>
                                    </div>
                                </div>

                                {/* Subtopic Items — scrollable */}
                                <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                                    {activeSubtopics.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <p className="text-slate-400 font-medium text-sm">No subtopics available for this chapter yet.</p>
                                        </div>
                                    ) : (
                                        activeSubtopics.map((subtopic, idx) => (
                                            <div
                                                key={subtopic.id}
                                                className="px-6 py-4 hover:bg-indigo-50/40 transition-colors flex items-center gap-4 group"
                                            >
                                                <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    {idx + 1}
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">
                                                    {subtopic.name}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default SyllabusView;
