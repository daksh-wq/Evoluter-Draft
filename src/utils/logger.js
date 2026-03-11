/**
 * Environment-Aware Logger
 * Logs to console in development, silent in production
 * Prevents leaking sensitive information in production builds
 * 
 * Usage:
 * import logger from './utils/logger';
 * logger.info('User logged in', { userId: user.id });
 * logger.error('Failed to fetch data', error);
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Format log message with timestamp
 * @private
 */
const formatMessage = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (data) {
        return [prefix, message, data];
    }
    return [prefix, message];
};

/**
 * Logger class with environment-aware methods
 */
class Logger {
    /**
     * Log informational messages
     * Only logs in development
     */
    info(message, data = null) {
        if (isDevelopment) {
            console.log(...formatMessage('info', message, data));
        }
    }

    /**
     * Log warning messages
     * Logs in both dev and prod (warnings are important)
     */
    warn(message, data = null) {
        if (isDevelopment) {
            console.warn(...formatMessage('warn', message, data));
        } else {
            // In production, log minimal info
            console.warn(`[WARN] ${message}`);
        }
    }

    /**
     * Log error messages
     * In dev: Full stack trace
     * In prod: Minimal info (use errorHandler.js for user-facing errors)
     */
    error(message, error = null) {
        if (isDevelopment) {
            console.error(...formatMessage('error', message, null));
            if (error) {
                console.error('Error details:', error);
                if (error.stack) {
                    console.error('Stack trace:', error.stack);
                }
            }
        } else {
            // Production: Only log message, not full error details
            console.error(`[ERROR] ${message}`);
            // Don't log error object to avoid leaking sensitive info
        }
    }

    /**
     * Log debug messages
     * Only in development, completely silent in production
     */
    debug(message, data = null) {
        if (isDevelopment) {
            console.debug(...formatMessage('debug', message, data));
        }
    }

    /**
     * Log success messages (for important operations)
     * Only in development
     */
    success(message, data = null) {
        if (isDevelopment) {
            console.log(`✅ ${message}`, data || '');
        }
    }

    /**
     * Create a grouped console log
     * Only in development
     */
    group(label, callback) {
        if (isDevelopment) {
            console.group(label);
            callback();
            console.groupEnd();
        }
    }

    /**
     * Log API request/response (useful for debugging)
     * Only in development
     */
    api(method, url, data = null) {
        if (isDevelopment) {
            console.group(`🌐 API ${method.toUpperCase()} ${url}`);
            if (data) {
                console.log('Data:', data);
            }
            console.groupEnd();
        }
    }

    /**
     * Log performance metrics
     * Only in development
     */
    performance(label, duration) {
        if (isDevelopment) {
            console.log(`⏱️ ${label}: ${duration}ms`);
        }
    }

    /**
     * Table output for structured data
     * Only in development
     */
    table(data) {
        if (isDevelopment && console.table) {
            console.table(data);
        }
    }
}

// Export singleton instance
const logger = new Logger();

export default logger;

/**
 * Usage Examples:
 * 
 * import logger from './utils/logger';
 * 
 * // Basic logging
 * logger.info('User authenticated', { userId: user.id });
 * logger.warn('Low memory available');
 * logger.error('Failed to save data', error);
 * 
 * // Grouped logs
 * logger.group('User Login Flow', () => {
 *   logger.info('Validating credentials');
 *   logger.info('Fetching user data');
 *   logger.success('Login complete');
 * });
 * 
 * // API logging
 * logger.api('POST', '/api/users', { email: 'user@example.com' });
 * 
 * // Performance logging
 * const start = Date.now();
 * await fetchData();
 * logger.performance('Data fetch', Date.now() - start);
 * 
 * // Table logging
 * logger.table([
 *   { name: 'Alice', score: 95 },
 *   { name: 'Bob', score: 87 }
 * ]);
 */
