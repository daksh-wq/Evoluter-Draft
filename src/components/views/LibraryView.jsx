import React from 'react';
import { BookOpen, FileText, ExternalLink } from 'lucide-react';
import { LIBRARY_TABS } from '../../constants/data';
import { UPSC_LIBRARY_RESOURCES } from '../../constants/upscLibrary';


/**
 * LibraryView Component
 * Resource library for managing study materials
 */
const LibraryView = () => {
    const [activeTab, setActiveTab] = React.useState(LIBRARY_TABS[0]);
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredDocs = UPSC_LIBRARY_RESOURCES.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesTab = activeTab === 'All Resources' || doc.category === activeTab;

        return matchesSearch && matchesTab;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <header className="border-b border-slate-200 pb-6">
                <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-950 tracking-tight">
                    Resource Library
                </h1>
                <p className="text-slate-500 mt-1">
                    Browse curated study materials and resources.
                </p>
            </header>

            {/* Search Bar */}
            <div className="relative mb-6">
                <input
                    type="text"
                    placeholder="Search documents, topics, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2278B0]/20 focus:border-[#2278B0] transition-all"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {LIBRARY_TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === tab
                            ? 'bg-indigo-950 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Empty State */}
            {filteredDocs.length === 0 && (
                <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                    <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No Results Found</h3>
                    <p className="text-slate-500">Try adjusting your search or filter.</p>
                </div>
            )}

            {/* Document Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocs.map((doc) => (
                    <div
                        key={doc.id}
                        className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#2278B0] hover:shadow-lg transition-all group relative overflow-hidden flex flex-col h-full"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${doc.type === 'Link' ? 'bg-purple-50 text-purple-600' : 'bg-[#2278B0]/5 text-[#2278B0]'}`}>
                                {doc.type === 'PDF' ? <FileText size={24} /> : doc.type === 'Link' ? <ExternalLink size={24} /> : <BookOpen size={24} />}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-green-50 text-green-600 px-2 py-1 rounded-lg border border-green-100 truncate max-w-[100px]">
                                {doc.category || 'General'}
                            </span>
                        </div>

                        {/* Title */}
                        <h3
                            className="text-lg font-bold text-indigo-950 mb-2 line-clamp-2 leading-tight min-h-[3rem]"
                            title={doc.title}
                        >
                            {doc.title}
                        </h3>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4 min-h-[1.5rem]">
                            {doc.tags?.slice(0, 3).map((t, idx) => (
                                <span
                                    key={idx}
                                    className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-6 mt-auto">
                            <span className="flex items-center gap-1">
                                <FileText size={12} /> {doc.size || '2MB'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>{doc.uploadDate?.toDate ? new Date(doc.uploadDate.toDate()).toLocaleDateString() : 'Recently'}</span>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex gap-2">
                            <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-3 bg-[#2278B0] text-white hover:bg-[#1b5f8a] rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <ExternalLink size={14} /> Read Now
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LibraryView;
