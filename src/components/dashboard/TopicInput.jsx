import React from 'react';
import { Settings } from 'lucide-react';

/**
 * TopicInput Component
 * Input field for custom topic entry with configuration toggle.
 * 
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {function} props.onChange - Callback for input change
 * @param {function} props.onEnter - Callback for Enter key press
 * @param {function} props.onToggleConfig - Callback to toggle configuration panel
 * @param {boolean} props.showConfig - Whether configuration panel is visible
 * @param {function} props.setShowSuggestions - Setter for showSuggestions
 */
export const TopicInput = ({
    value,
    onChange,
    onEnter,
    onToggleConfig,
    showConfig,
    setShowSuggestions,
}) => {
    return (
        <>
            {/* Topic Input */}
            <div className="md:col-span-6 relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onEnter()}
                    onFocus={() => setShowSuggestions && setShowSuggestions(true)}
                    onBlur={() => {
                        // Delay hiding so clicks register
                        setTimeout(() => setShowSuggestions && setShowSuggestions(false), 200);
                    }}
                    placeholder="Or type specific topic (e.g., 'G20 Summit')..."
                    className="w-full px-4 py-3 md:py-3.5 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-blue-400/50 placeholder:text-slate-400"
                />
            </div>

            {/* Config Toggle */}
            <div className="md:col-span-2">
                <button
                    onClick={onToggleConfig}
                    className={`w-full h-full py-3 md:py-3.5 rounded-xl font-bold border flex items-center justify-center gap-2 transition-all ${showConfig ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-blue-100 hover:bg-white/20'}`}
                >
                    <Settings size={18} />
                    <span>Config</span>
                </button>
            </div>
        </>
    );
};
