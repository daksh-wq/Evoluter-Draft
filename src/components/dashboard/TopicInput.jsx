import React from 'react';
import { Settings } from 'lucide-react';

/**
 * TopicInput Component
 * Input field for custom topic entry.
 * 
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {function} props.onChange - Callback for input change
 * @param {function} props.onEnter - Callback for Enter key press
 * @param {function} props.setShowSuggestions - Setter for showSuggestions
 */
export const TopicInput = ({
    value,
    onChange,
    onEnter,
    setShowSuggestions,
}) => {
    return (
        <div className="md:col-span-8 relative">
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
    );
};
