import React, { useState } from 'react';
import { SUBJECTS_LIST, CHAPTERS_LIST, SUBTOPICS_LIST } from '../../constants/subjectChapterData';
import { Target, ArrowLeft, BookOpen, FileText } from 'lucide-react';

const SyllabusView = () => {
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [selectedChapterId, setSelectedChapterId] = useState(null);

    // Get selected subject to display its info
    const selectedSubject = selectedSubjectId 
        ? SUBJECTS_LIST.find(s => s.id === selectedSubjectId) 
        : null;

    // Get selected chapter to display its info
    const selectedChapter = selectedChapterId 
        ? CHAPTERS_LIST.find(c => c.id === selectedChapterId) 
        : null;

    // Filter chapters by selected subject
    const activeChapters = selectedSubjectId 
        ? CHAPTERS_LIST.filter(c => String(c.subjectId).trim().toLowerCase() === String(selectedSubjectId).trim().toLowerCase()) 
        : [];

    // Filter subtopics by selected chapter
    const activeSubtopics = selectedChapterId 
        ? SUBTOPICS_LIST.filter(s => String(s.chapterId).trim().toLowerCase() === String(selectedChapterId).trim().toLowerCase()) 
        : [];

    const goBack = () => {
        if (selectedChapterId) {
            setSelectedChapterId(null);
        } else if (selectedSubjectId) {
            setSelectedSubjectId(null);
        }
    };

    return (
        <div className="space-y-6 px-4 pt-4 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="border-b border-slate-200 pb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-indigo-950 tracking-tight flex items-center gap-3">
                        {(selectedSubjectId || selectedChapterId) && (
                            <button 
                                onClick={goBack} 
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-2 cursor-pointer"
                                title="Go Back"
                            >
                                <ArrowLeft size={24} className="text-slate-600" />
                            </button>
                        )}
                        <Target className="text-indigo-600" size={32} />
                        Syllabus Tracker
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        {selectedChapter 
                            ? `Subtopics for ${selectedChapter.name}`
                            : selectedSubject 
                                ? `Chapters for ${selectedSubject.name}`
                                : 'Explore subjects and track your coverage of the syllabus.'}
                    </p>
                </div>
            </div>

            {/* Drill-down Content */}
            <div className="mt-8">
                {/* Level 1: Subjects */}
                {!selectedSubjectId && !selectedChapterId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {SUBJECTS_LIST.map((subject) => {
                            const chaptersCount = CHAPTERS_LIST.filter(c => String(c.subjectId).trim().toLowerCase() === String(subject.id).trim().toLowerCase()).length;
                            return (
                                <div
                                    key={subject.id}
                                    onClick={() => setSelectedSubjectId(subject.id)}
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

                {/* Level 2: Chapters */}
                {selectedSubjectId && !selectedChapterId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activeChapters.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                                <p className="text-slate-500 font-medium">No chapters available for this subject yet.</p>
                            </div>
                        ) : (
                            activeChapters.map((chapter) => {
                                const matchedSubtopics = SUBTOPICS_LIST.filter(s => String(s.chapterId).trim().toLowerCase() === String(chapter.id).trim().toLowerCase());
                                console.log("Chapter:", chapter.id, "| Matched Subtopics:", matchedSubtopics);
                                const subtopicsCount = matchedSubtopics.length;
                                return (
                                    <div
                                        key={chapter.id}
                                        onClick={() => setSelectedChapterId(chapter.id)}
                                        className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                                    >
                                        <div>
                                            <h4 className="text-base font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                                                {chapter.name}
                                            </h4>
                                            <p className="text-xs font-medium text-slate-500">
                                                {subtopicsCount} Subtopics
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                                            <ArrowLeft size={16} className="rotate-180" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Level 3: Subtopics */}
                {selectedChapterId && (
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-5 md:p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <FileText className="text-blue-600" size={24} />
                                    {selectedChapter?.name}
                                </h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">
                                    {activeSubtopics.length} related topics
                                </p>
                            </div>
                        </div>
                        
                        <div className="divide-y divide-slate-100">
                            {activeSubtopics.length === 0 ? (
                                <div className="p-12 text-center">
                                    <p className="text-slate-500 font-medium">No subtopics available for this chapter.</p>
                                </div>
                            ) : (
                                activeSubtopics.map((subtopic, idx) => (
                                    <div key={subtopic.id} className="p-4 md:p-5 hover:bg-slate-50 transition-colors flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h5 className="text-sm md:text-base font-bold text-slate-800">
                                                {subtopic.name}
                                            </h5>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SyllabusView;
