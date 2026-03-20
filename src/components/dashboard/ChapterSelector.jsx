import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Layers, ChevronDown } from 'lucide-react';
import { CHAPTERS_LIST } from '../../constants/subjectChapterData';

/**
 * ChapterSelector Component
 * Dropdown to select a chapter based on selected subjects.
 * 
 * @param {Object} props
 * @param {Array} props.selectedSubjects - Array of selected subject names
 * @param {string} props.value - Current selected chapter/topic
 * @param {function} props.onChange - Callback when chapter is selected
 * @param {boolean} props.disabled - Whether input is disabled
 */
export const ChapterSelector = ({
    selectedSubjects,
    value,
    onChange,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get available chapters based on selected subjects
    const availableChapters = useMemo(() => {
        if (!selectedSubjects || selectedSubjects.length === 0) {
            return [];
        }

        const subjectMapping = {
            'All': ['polity', 'history', 'culture', 'geography', 'economy', 'environment', 'science_tech', 'biology'],
            'Indian Polity': ['polity'],
            'Ancient and Medieval History': ['history'],
            'Modern India': ['history'],
            'Indian Culture': ['culture'],
            'Geography': ['geography'],
            'Economy of India': ['economy'],
            'Environment': ['environment'],
            'Science and Technology': ['science_tech', 'biology'],
            'Current Affairs': [],
            'Trivial': []
        };

        let chapters = [];
        selectedSubjects.forEach(subjectName => {
            const subjectIds = subjectMapping[subjectName] || [];
            subjectIds.forEach(subjectId => {
                const subjectChapters = CHAPTERS_LIST.filter(c => c.subjectId === subjectId).map(c => c.name);
                subjectChapters.forEach(cName => {
                    if (!chapters.includes(cName)) chapters.push(cName);
                });
            });
        });
        return chapters;
    }, [selectedSubjects]);

    const displayValue = value || (availableChapters.length > 0 ? "Select Chapter..." : "Select Subject First...");

    return (
        <div className="md:col-span-8 relative group" ref={dropdownRef}>
            <div
                className={`w-full pl-10 pr-10 py-3 md:py-3.5 rounded-xl text-slate-900 font-medium focus:outline-none ring-1 ring-slate-200 bg-white flex items-center justify-between transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:ring-4 focus:ring-blue-400/50'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Layers size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <span className={`truncate ${!value ? 'text-slate-400' : 'text-slate-900'}`}>{displayValue}</span>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 max-h-60 overflow-y-auto">
                    {availableChapters.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                            Please select a subject to view its chapters.
                        </div>
                    ) : (
                        availableChapters.map((chapter, idx) => {
                            const isSelected = value === chapter;
                            return (
                                <div
                                    key={`${chapter}-${idx}`}
                                    className={`flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!disabled) {
                                            onChange(chapter);
                                            setIsOpen(false);
                                        }
                                    }}
                                >
                                    <span className={`text-sm leading-snug ${isSelected ? 'font-bold text-[#2278B0]' : 'font-medium text-slate-600'}`}>
                                        {chapter}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};
