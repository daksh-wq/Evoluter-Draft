import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);
    const timerIds = useRef([]);

    useEffect(() => {
        const handleAddToast = (e) => {
            const { type, message } = e.detail;
            const id = Date.now() + Math.random().toString(36).substring(2, 9);
            
            setToasts(prev => [...prev, { id, type, message }]);
            
            // Auto close after 3.5s — track the timer so it can be cancelled on unmount
            // Fix #4: remove each timer from the ref once it fires to prevent unbounded growth
            const timer = setTimeout(() => {
                removeToast(id);
                timerIds.current = timerIds.current.filter(t => t !== timer);
            }, 3500);
            timerIds.current.push(timer);
        };

        window.addEventListener('add-toast', handleAddToast);
        return () => {
            window.removeEventListener('add-toast', handleAddToast);
            // Clear any pending timers to prevent state updates on unmounted component
            timerIds.current.forEach(clearTimeout);
            timerIds.current = [];
        };
    }, []);

    // Fix #5: stable reference so closures never capture a stale version
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <div className="fixed top-4 right-2 sm:right-4 left-2 sm:left-auto z-[9999] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map(t => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                        className="pointer-events-auto"
                    >
                        <Toast type={t.type} message={t.message} onClose={() => removeToast(t.id)} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

const Toast = ({ type, message, onClose }) => {
    const types = {
        success: { icon: CheckCircle, className: 'bg-emerald-50 text-emerald-800 border-emerald-200', iconColor: 'text-emerald-500' },
        error: { icon: AlertCircle, className: 'bg-red-50 text-red-800 border-red-200', iconColor: 'text-red-500' },
        info: { icon: Info, className: 'bg-blue-50 text-blue-800 border-blue-200', iconColor: 'text-blue-500' },
        warning: { icon: AlertTriangle, className: 'bg-amber-50 text-amber-800 border-amber-200', iconColor: 'text-amber-500' }
    };

    const config = types[type] || types.info;
    const Icon = config.icon;

    return (
        <div className={`flex items-start gap-3 p-4 pr-12 rounded-xl border shadow-lg relative w-full sm:min-w-[300px] sm:max-w-sm max-w-[calc(100vw-1rem)] ${config.className}`}>
            <Icon className={`flex-shrink-0 mt-0.5 ${config.iconColor}`} size={20} />
            <p className="font-semibold text-sm leading-relaxed">{message}</p>
            <button onClick={onClose} aria-label="Close notification" className="absolute right-3 top-4 p-1 hover:bg-black/5 rounded-lg transition-colors">
                <X size={16} className="opacity-50 hover:opacity-100" />
            </button>
        </div>
    );
};

export default ToastContainer;
