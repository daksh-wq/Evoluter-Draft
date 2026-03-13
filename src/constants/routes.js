/**
 * Route Constants
 * Centralized route paths to prevent typos and simplify refactoring
 * 
 * Usage:
 * import { ROUTES } from './constants/routes';
 * navigate(ROUTES.DASHBOARD);
 */

export const ROUTES = {
    // Public Routes
    HOME: '/',
    LOGIN: '/login',
    ABOUT: '/about',
    CONTACT: '/contact',
    PRIVACY: '/privacy',
    TERMS: '/terms',
    PRICING: '/pricing',
    CHECKOUT: '/checkout',


    // Protected Routes
    DASHBOARD: '/dashboard',
    ONBOARDING: '/onboarding',

    // Test Routes
    TEST: '/test',
    RESULT: '/result',
    TEST_HISTORY: '/test-history',
    TEST_REVIEW: '/test-history/:testId',

    // Learning Routes
    LIBRARY: '/library',
    PYQS: '/pyqs',
    FLASHCARDS: '/flashcards',
    SYLLABUS: '/syllabus',

    // Practice Routes
    MAINS_EVALUATOR: '/mains-evaluator',

    // Community Routes
    // LEADERBOARD: '/leaderboard',
    // NEWS: '/news',

    // User Routes
    PROFILE: '/profile',

    // Admin Routes
    ADMIN_DASHBOARD: '/admin',
    ADMIN_USERS: '/admin/users',
    ADMIN_CMS: '/admin/cms',
    ADMIN_ANALYTICS: '/admin/analytics',
};

/**
 * Route metadata for navigation menus
 */
export const ROUTE_CONFIG = {
    [ROUTES.DASHBOARD]: {
        title: 'Dashboard',
        icon: 'LayoutDashboard',
        requiresAuth: true,
    },
    [ROUTES.TEST]: {
        title: 'AI Test',
        icon: 'Zap',
        requiresAuth: true,
    },
    [ROUTES.LIBRARY]: {
        title: 'Library',
        icon: 'BookOpen',
        requiresAuth: true,
    },
    [ROUTES.PYQS]: {
        title: 'PYQs',
        icon: 'History',
        requiresAuth: true,
    },
    [ROUTES.FLASHCARDS]: {
        title: 'Flashcards',
        icon: 'CreditCard',
        requiresAuth: true,
    },
    [ROUTES.MAINS_EVALUATOR]: {
        title: 'Mains Evaluator',
        icon: 'FileText',
        requiresAuth: true,
    },
    [ROUTES.SYLLABUS]: {
        title: 'Syllabus Tracker',
        icon: 'CheckSquare',
        requiresAuth: true,
    },
    // [ROUTES.NEWS]: {
    //     title: 'Current Affairs',
    //     icon: 'Newspaper',
    //     requiresAuth: true,
    // },
    // [ROUTES.LEADERBOARD]: {
    //     title: 'Leaderboard',
    //     icon: 'Trophy',
    //     requiresAuth: true,
    // },
    [ROUTES.PRICING]: {
        title: 'Pricing',
        icon: 'CreditCard',
        requiresAuth: false,
    },
    [ROUTES.CHECKOUT]: {
        title: 'Checkout',
        icon: 'ShoppingCart',
        requiresAuth: false,
    },
    [ROUTES.PROFILE]: {
        title: 'Profile',
        icon: 'User',
        requiresAuth: true,
    },
};

/**
 * Check if route requires authentication
 * @param {string} path - Route path
 * @returns {boolean} - True if route requires auth
 */
export const requiresAuth = (path) => {
    return ROUTE_CONFIG[path]?.requiresAuth ?? false;
};

/**
 * Get route title
 * @param {string} path - Route path
 * @returns {string} - Route title
 */
export const getRouteTitle = (path) => {
    return ROUTE_CONFIG[path]?.title ?? 'Unknown';
};
