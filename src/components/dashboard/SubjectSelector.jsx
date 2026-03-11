import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { SUBJECTS } from '../../constants/appConstants';

/**
 * SubjectSelector Component
 * Dropdown to select multiple subjects for AI test generation.
 * 
 * @param {Object} props
 * @param {function} props.onSelect - Callback function when subjects are selected
 */
export const SubjectSelector = ({ onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState([]);
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

    const toggleSubject = (subject) => {
        let newSelected;
        if (selected.includes(subject)) {
            newSelected = selected.filter(s => s !== subject);
        } else {
            newSelected = [...selected, subject];
        }
        setSelected(newSelected);
        onSelect(newSelected.join(', '));
    };

    const displayValue = selected.length === 0
        ? "Mix Subjects..."
        : selected.length === 1
            ? selected[0]
            : `${selected.length} Subjects Mixed`;

    return (
        <div className="md:col-span-4 relative group" ref={dropdownRef}>
            <div
                className="w-full pl-10 pr-10 py-3 md:py-3.5 rounded-xl text-slate-900 font-medium focus:outline-none ring-1 ring-slate-200 focus:ring-4 focus:ring-blue-400/50 bg-white cursor-pointer flex items-center justify-between"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <span className={`truncate ${selected.length === 0 ? 'text-slate-500' : 'text-slate-900'}`}>{displayValue}</span>
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
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSubject(subject);
                                }}
                            >
                                {isSelected ? (
                                    <CheckSquare size={18} className="text-[#2278B0]" />
                                ) : (
                                    <Square size={18} className="text-slate-300" />
                                )}
                                <span className={`text-sm ${isSelected ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
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
