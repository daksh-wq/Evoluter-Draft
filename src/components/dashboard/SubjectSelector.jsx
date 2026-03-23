import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, ChevronDown, Circle, CheckCircle } from 'lucide-react';
import { SUBJECTS } from '../../constants/appConstants';

/**
 * SubjectSelector Component
 * Multi-select dropdown for subject selection.
 */
export const SubjectSelector = ({ onSelect, onSubjectsChange, disabled = false, className = "md:col-span-4" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState([]); // array 
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

    const selectSubject = (subject) => {
        let newSelected;
        if (subject === 'All') {
            newSelected = selected.includes('All') ? [] : ['All'];
        } else {
            if (selected.includes(subject)) {
                newSelected = selected.filter(s => s !== subject);
            } else {
                newSelected = [...selected.filter(s => s !== 'All'), subject];
            }
        }
        
        setSelected(newSelected);
        onSelect(''); // clear chapter when subject changes
        if (onSubjectsChange) onSubjectsChange(newSelected);
    };

    let displayValue = 'Select Subjects...';
    if (selected.length === 1) {
        displayValue = selected[0];
    } else if (selected.length > 1) {
        displayValue = `${selected.length} Subjects Selected`;
    }

    return (
        <div className={`${className} relative group`} ref={dropdownRef}>
            <div
                className={`w-full pl-10 pr-10 py-3 md:py-3.5 rounded-xl text-slate-900 font-medium focus:outline-none ring-1 ${selected.length > 0 ? 'ring-[#2278B0]' : 'ring-slate-200'} bg-white flex items-center justify-between transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:ring-4 focus:ring-blue-400/50'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen size={18} className={`${selected.length > 0 ? 'text-[#2278B0]' : 'text-slate-400'} group-focus-within:text-blue-500 transition-colors`} />
                </div>
                <span className={`truncate ${selected.length > 0 ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                    {displayValue}
                </span>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 max-h-60 overflow-y-auto">
                    {SUBJECTS.map((subject) => {
                        const isSelected = selected.includes(subject);
                        return (
                            <div
                                key={subject}
                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!disabled) selectSubject(subject);
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
                                    {subject}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

