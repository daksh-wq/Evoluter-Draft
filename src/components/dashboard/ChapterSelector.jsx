import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Layers, ChevronDown, CheckCircle, Circle } from 'lucide-react';
import { SUBJECT_CODES, TOPIC_CODES } from '../../constants/appConstants';

/**
 * ChapterSelector (now acts as Subtopic Selector)
 * Multi-select dropdown to select subtopics based on selected subjects.
 * 
 * @param {Object} props
 * @param {Array} props.selectedSubjects - Array of selected subject names
 * @param {Array|Set} props.value - Current selected subtopics (Array)
 * @param {function} props.onChange - Callback when subtopics change
 * @param {boolean} props.disabled - Whether input is disabled
 */
export const ChapterSelector = ({
    selectedSubjects = [],
    value = [], // Should be an array of selected subtopics
    onChange,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Ensure value is handled as an array
    const selectedList = Array.isArray(value) ? value : Array.from(value || []);

    // Initial setup to parent
    useEffect(() => {
        if (!selectedList.includes('All Sub-topics') && selectedList.length === 0) {
           onChange(['All Sub-topics']);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get available subtopics based on new selected subjects
    const availableChapters = useMemo(() => {
        let codes = [];
        if (!selectedSubjects || selectedSubjects.length === 0 || selectedSubjects.includes('All Subjects')) {
            // All subjects implies all subtopics
            Object.values(TOPIC_CODES).forEach(topicsObj => {
                codes = [...codes, ...Object.values(topicsObj)];
            });
        } else {
            selectedSubjects.forEach(sub => {
                const code = SUBJECT_CODES[sub];
                if (code && TOPIC_CODES[code]) {
                    codes = [...codes, ...Object.values(TOPIC_CODES[code])];
                }
            });
        }
        return [...new Set(codes)].sort();
    }, [selectedSubjects]);

    const selectSubtopic = (topic) => {
        let newSelected;
        if (topic === 'All Sub-topics') {
            newSelected = ['All Sub-topics'];
        } else {
            if (selectedList.includes(topic)) {
                newSelected = selectedList.filter(t => t !== topic);
                if (newSelected.length === 0) newSelected = ['All Sub-topics'];
            } else {
                newSelected = [...selectedList.filter(t => t !== 'All Sub-topics'), topic];
            }
        }
        onChange(newSelected);
    };

    let displayValue = 'Select Sub-topics...';
    if (selectedList.includes('All Sub-topics')) {
        displayValue = 'All Sub-topics';
    } else if (selectedList.length === 1) {
        displayValue = selectedList[0];
    } else if (selectedList.length > 1) {
        displayValue = `${selectedList.length} Sub-topics Selected`;
    }
    
    // The options to display in dropdown
    const displayOptions = ['All Sub-topics', ...availableChapters];

    return (
        <div className="md:col-span-3 relative group" ref={dropdownRef}>
            <div
                className={`w-full pl-10 pr-10 py-3 md:py-3.5 rounded-xl text-slate-900 font-medium focus:outline-none ring-1 ${selectedList.length > 0 ? 'ring-[#2278B0]' : 'ring-slate-200'} bg-white flex items-center justify-between transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:ring-4 focus:ring-blue-400/50'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Layers size={18} className={`${selectedList.length > 0 ? 'text-[#2278B0]' : 'text-slate-400'} group-focus-within:text-blue-500 transition-colors`} />
                </div>
                <span className={`truncate ${selectedList.length > 0 ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                    {displayValue}
                </span>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 max-h-60 overflow-y-auto">
                    {displayOptions.length <= 1 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                            Please select a subject to view its subtopics.
                        </div>
                    ) : (
                        displayOptions.map((chapter, idx) => {
                            const isSelected = selectedList.includes(chapter);
                            return (
                                <div
                                    key={`${chapter}-${idx}`}
                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!disabled) selectSubtopic(chapter);
                                    }}
                                >
                                    <div className="flex-shrink-0">
                                        {isSelected ? (
                                            <CheckCircle size={17} className="text-[#2278B0]" />
                                        ) : (
                                            <Circle size={17} className="text-slate-300" />
                                        )}
                                    </div>
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
