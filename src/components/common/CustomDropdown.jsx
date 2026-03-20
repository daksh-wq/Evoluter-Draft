import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

const CustomDropdown = ({
    label,
    icon,
    options,
    value,
    onChange,
    initialShowCount = 6,
    isFilter = false,
    fullWidth = false,
    className = "",
    disabled = false
}) => {
    const [open, setOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Ensure options are an array of { label, value }
    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    // Filter handling specifically for "All" similar to PYQ View
    const allOption = normalizedOptions.find(o => o.value === 'All' || o.value === 'all' || o.value === '');
    const regularOptions = normalizedOptions.filter(o => o.value !== 'All' && o.value !== 'all' && o.value !== '');

    const displayOptions = showAll ? regularOptions : regularOptions.slice(0, initialShowCount);
    const hasMore = regularOptions.length > initialShowCount;

    const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

    // An active filter means value is not 'All' or empty
    const isActiveFilter = isFilter && value !== 'All' && value !== 'all' && value !== '' && value !== null;

    // Display text
    const displayText = isFilter && isActiveFilter && selectedOption
        ? selectedOption.label
        : selectedOption && !isFilter
            ? selectedOption.label
            : label;

    return (
        <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`} ref={ref}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''
                    } ${fullWidth
                        ? 'w-full bg-slate-50 border border-slate-200 text-slate-700 hover:border-[#2278B0]/40 outline-none focus:ring-0 focus:border-[#2278B0]/40'
                        : 'whitespace-nowrap'
                    } ${!fullWidth && isActiveFilter
                        ? 'bg-[#2278B0] text-white border-[#2278B0]'
                        : !fullWidth ? 'bg-white text-slate-700 border-slate-200 hover:border-[#2278B0]/40 hover:bg-slate-50' : ''
                    }`}
            >
                <div className="flex items-center gap-2 overflow-hidden truncate">
                    {icon && <span className="opacity-70 flex-shrink-0">{icon}</span>}
                    <span className={`truncate text-left ${fullWidth && !selectedOption ? 'text-slate-400' : ''}`}>
                        {displayText}
                    </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                    {isFilter && isActiveFilter && !fullWidth && (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                if (allOption) onChange(allOption.value);
                                setOpen(false);
                            }}
                            className="p-0.5 rounded-full hover:bg-black/10 transition-colors"
                        >
                            <X size={14} />
                        </span>
                    )}
                    <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {open && !disabled && (
                <div className={`absolute top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[70vh] flex flex-col ${fullWidth ? 'w-full left-0 origin-top' : 'left-[-10px] min-w-[140px] max-w-[280px]'
                    }`}>

                    {allOption && (
                        <button
                            type="button"
                            onClick={() => { onChange(allOption.value); setOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold border-b border-slate-100 transition-colors ${String(value) === String(allOption.value) ? 'bg-[#2278B0]/5 text-[#2278B0]' : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <span>{allOption.label}</span>
                            {String(value) === String(allOption.value) && <Check size={14} className="text-[#2278B0]" />}
                        </button>
                    )}

                    <div className="py-1 max-h-60 overflow-y-auto">
                        {displayOptions.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${String(value) === String(opt.value)
                                    ? 'bg-[#2278B0]/8 text-[#2278B0] font-semibold'
                                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                                    }`}
                            >
                                <span className="truncate text-left">{opt.label}</span>
                                {String(value) === String(opt.value) && <Check size={14} className="text-[#2278B0] flex-shrink-0 ml-2" />}
                            </button>
                        ))}
                    </div>

                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => setShowAll(s => !s)}
                            className="w-full px-4 py-2.5 text-xs font-bold text-[#2278B0] border-t border-slate-100 hover:bg-[#2278B0]/5 transition-colors text-center"
                        >
                            {showAll ? '▲ Show Less' : `▼ Show ${regularOptions.length - initialShowCount} More`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;
