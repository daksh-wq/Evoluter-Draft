import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button Component
 * Eliminates repeated Tailwind classes across 40+ locations
 * 
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'} props.variant - Button style variant
 * @param {'sm' | 'md' | 'lg'} props.size - Button size
 * @param {boolean} props.loading - Show loading spinner
 * @param {boolean} props.disabled - Disable button
 * @param {boolean} props.fullWidth - Make button full width
 * @param {string} props.className - Additional custom classes
 * @param {React.ReactNode} props.children - Button content
 * @param {React.ReactNode} props.icon - Optional icon (left side)
 */
const Button = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    children,
    icon,
    ...props
}) => {
    // Base styles (shared by all variants)
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // Variant styles
    const variantStyles = {
        primary: 'bg-[#2278B0] hover:bg-[#1b5f8a] text-white focus:ring-[#2278B0] shadow-sm hover:shadow-md active:scale-95',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-300 active:scale-95',
        danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm hover:shadow-md active:scale-95',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-300',
        outline: 'border-2 border-[#2278B0] bg-transparent hover:bg-[#2278B0] text-[#2278B0] hover:text-white focus:ring-[#2278B0]',
    };

    // Size styles
    const sizeStyles = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Combine all styles
    const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`;

    return (
        <button
            className={buttonClasses}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
                    <span>Loading...</span>
                </>
            ) : (
                <>
                    {icon && <span className="flex items-center">{icon}</span>}
                    {children}
                </>
            )}
        </button>
    );
};

/**
 * Icon Button - Square button for icons only
 */
export const IconButton = ({
    variant = 'ghost',
    size = 'md',
    className = '',
    children,
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
        primary: 'bg-[#2278B0] hover:bg-[#1b5f8a] text-white focus:ring-[#2278B0]',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-300',
        danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-300',
    };

    const sizeStyles = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
    };

    const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    return (
        <button className={buttonClasses} {...props}>
            {children}
        </button>
    );
};

export default Button;
