/**
 * Error Handling Service
 * Centralized error handling with consistent user feedback and logging
 * 
 * Usage:
 * import { handleError, ErrorSeverity } from './utils/errorHandler';
 * handleError(error, 'Failed to load data', ErrorSeverity.USER_FACING);
 */

/**
 * Error Severity Levels
 */
export const ErrorSeverity = {
    SILENT: 'silent',           // Log only, no user notification
    USER_FACING: 'user_facing', // Show toast notification to user
    CRITICAL: 'critical',       // Show modal, block UI if needed
};

/**
 * Error Categories for better debugging
 */
export const ErrorCategory = {
    NETWORK: 'network',
    AUTH: 'authentication',
    VALIDATION: 'validation',
    STORAGE: 'storage',
    AI_SERVICE: 'ai_service',
    DATABASE: 'database',
    ROUTING: 'routing',
    UNKNOWN: 'unknown',
};

// ─── Toast Notification System ───────────────────────────────────────────────

let toastContainer = null;

/**
 * Get or create the toast container
 * @private
 */
const getToastContainer = () => {
    if (toastContainer && document.body.contains(toastContainer)) {
        return toastContainer;
    }

    toastContainer = document.createElement('div');
    toastContainer.id = 'evoluter-toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('aria-atomic', 'true');
    Object.assign(toastContainer.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '99999',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: '100%',
        pointerEvents: 'none',
    });
    document.body.appendChild(toastContainer);
    return toastContainer;
};

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {'error'|'warning'|'info'|'success'} type - Toast type
 * @param {number} duration - Auto-dismiss in ms (default 5000)
 */
export const showToast = (message, type = 'error', duration = 5000) => {
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.setAttribute('role', 'alert');

    const icons = {
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
        success: '✓',
    };

    const colors = {
        error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '#dc2626' },
        warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '#f59e0b' },
        info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '#3b82f6' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: '#22c55e' },
    };

    const c = colors[type] || colors.error;

    Object.assign(toast.style, {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: '12px',
        border: `1px solid ${c.border}`,
        backgroundColor: c.bg,
        color: c.text,
        fontSize: '14px',
        fontWeight: '500',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
        pointerEvents: 'auto',
        transform: 'translateX(120%)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        lineHeight: '1.5',
        maxWidth: '100%',
        wordBreak: 'break-word',
    });

    // Icon
    const iconEl = document.createElement('span');
    iconEl.textContent = icons[type] || icons.error;
    Object.assign(iconEl.style, {
        flexShrink: '0',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '700',
        color: 'white',
        backgroundColor: c.icon,
        lineHeight: '1',
    });

    // Message text
    const textEl = document.createElement('span');
    textEl.textContent = message;
    textEl.style.flex = '1';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    Object.assign(closeBtn.style, {
        flexShrink: '0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '18px',
        color: c.text,
        opacity: '0.5',
        padding: '0',
        lineHeight: '1',
    });

    const dismissToast = () => {
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    };

    closeBtn.addEventListener('click', dismissToast);

    toast.appendChild(iconEl);
    toast.appendChild(textEl);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    // Auto dismiss
    if (duration > 0) {
        setTimeout(dismissToast, duration);
    }

    // Limit visible toasts to 5
    const toasts = container.children;
    if (toasts.length > 5) {
        toasts[0].remove();
    }
};

// ─── Core Error Handling ─────────────────────────────────────────────────────

/**
 * Log error to console (dev) or external service (prod)
 * @private
 */
const logError = (error, context, category) => {
    const isDevelopment = import.meta.env.DEV;

    const errorDetails = {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        category,
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
    };

    if (isDevelopment) {
        console.group(`🔴 Error: ${category}`);
        console.error('Message:', error?.message);
        console.error('Context:', context);
        if (error?.stack) console.error('Stack:', error.stack);
        console.error('Full Details:', errorDetails);
        console.groupEnd();
    } else {
        // Production: Minimal logging (integrate Sentry/LogRocket here)
        console.error(`[ERROR][${category}] ${error?.message || 'Unknown'}`);
    }
};

/**
 * Notify user based on severity
 * @private
 */
const notifyUser = (userMessage, severity) => {
    if (severity === ErrorSeverity.SILENT) {
        return;
    }

    if (severity === ErrorSeverity.USER_FACING) {
        showToast(userMessage, 'error');
    } else if (severity === ErrorSeverity.CRITICAL) {
        showToast(`⚠ ${userMessage}`, 'error', 10000); // Longer duration for critical
    }
};

/**
 * Get user-friendly error message based on error type
 * @private
 */
const getUserMessage = (error, fallbackMessage) => {
    // Firebase Authentication errors
    if (error?.code?.startsWith('auth/')) {
        const authErrors = {
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'Email already registered.',
            'auth/weak-password': 'Password must be at least 6 characters.',
            'auth/invalid-email': 'Invalid email address.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled.',
            'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
            'auth/popup-closed-by-user': 'Sign-in cancelled.',
            'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
            'auth/network-request-failed': 'Network error. Check your connection.',
        };
        return authErrors[error.code] || fallbackMessage;
    }

    // Firestore errors
    if (error?.code === 'permission-denied' || error?.code?.includes('permission-denied')) {
        return 'You do not have permission to perform this action.';
    }

    if (error?.code === 'unavailable') {
        return 'Service temporarily unavailable. Please try again.';
    }

    // Network errors
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        return 'Network error. Please check your internet connection.';
    }

    // Quota errors
    if (error?.message?.includes('quota') || error?.message?.includes('429')) {
        return 'Rate limit reached. Please wait a moment and try again.';
    }

    return fallbackMessage;
};

/**
 * Main error handler
 */
export const handleError = (
    error,
    userMessage = 'An error occurred. Please try again.',
    severity = ErrorSeverity.USER_FACING,
    category = ErrorCategory.UNKNOWN,
    context = {}
) => {
    // Guard against null/undefined errors
    const safeError = error instanceof Error ? error : new Error(String(error || 'Unknown error'));

    logError(safeError, { userMessage, ...context }, category);

    const finalMessage = getUserMessage(safeError, userMessage);

    notifyUser(finalMessage, severity);
};

/**
 * Async error wrapper for cleaner try-catch
 */
export const withErrorHandling = async (
    asyncFn,
    userMessage,
    category = ErrorCategory.UNKNOWN,
    severity = ErrorSeverity.USER_FACING
) => {
    try {
        return await asyncFn();
    } catch (error) {
        handleError(error, userMessage, severity, category);
        throw error;
    }
};

/**
 * Error boundary helper for React components
 */
export class AppError extends Error {
    constructor(message, category = ErrorCategory.UNKNOWN, cause = null) {
        super(message);
        this.name = 'AppError';
        this.category = category;
        this.cause = cause;
    }
}

export default handleError;
