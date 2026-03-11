/**
 * Test Configuration Constants
 * Centralized configuration for test settings
 */

export const TEST_CONFIG = {
    // Mock Test Configuration
    MOCK_TEST: {
        DEFAULT_QUESTION_COUNT: 100,
        DEFAULT_DURATION_MINUTES: 120,
        MIN_QUESTION_COUNT: 10,
        MAX_QUESTION_COUNT: 200,
    },

    // AI Test Configuration
    AI_TEST: {
        DEFAULT_QUESTION_COUNT: 25,
        MIN_QUESTION_COUNT: 5,
        MAX_QUESTION_COUNT: 100,
        DEFAULT_DIFFICULTY: 'Hard',
        TIME_PER_QUESTION_SECONDS: 90, // 1.5 minutes per question
    },

    // Timer Configuration
    TIMER: {
        UPDATE_INTERVAL_MS: 1000, // 1 second
        WARNING_THRESHOLD_MINUTES: 5,
        CRITICAL_THRESHOLD_MINUTES: 1,
    },

    // Test Session
    SESSION: {
        AUTO_SUBMIT_ON_TIME_UP: true,
        ALLOW_PAUSE: false,
        SHOW_SOLUTIONS_IMMEDIATELY: true,
    },
};

/**
 * File Upload Configuration
 */
export const UPLOAD_CONFIG = {
    MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
    MAX_FILE_SIZE_MB: 2,
    ALLOWED_TYPES: {
        IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        ALL: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    },
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'],
};

/**
 * XP and Leveling System
 */
export const GAMIFICATION_CONFIG = {
    XP_PER_CORRECT_ANSWER: 10,
    XP_PER_TEST_COMPLETION: 50,
    XP_PER_LEVEL: 1000, // XP required per level
    STREAK_BONUS_XP: 25,

    // Level thresholds
    LEVELS: {
        BEGINNER: 1,
        INTERMEDIATE: 5,
        ADVANCED: 10,
        EXPERT: 20,
        MASTER: 50,
    },
};

/**
 * Analytics and Statistics
 */
export const ANALYTICS_CONFIG = {
    MASTERY_THRESHOLDS: {
        LOW: 40, // 0-40%: Needs work
        MEDIUM: 75, // 41-75%: Improving
        HIGH: 100, // 76-100%: Mastered
    },

    ACCURACY_THRESHOLDS: {
        POOR: 50,
        AVERAGE: 70,
        GOOD: 85,
        EXCELLENT: 95,
    },

    // Progress calculation weights
    WEIGHTS: {
        TOPIC_MASTERY: {
            EXISTING: 0.7,
            NEW: 0.3,
        },
        SYLLABUS_PROGRESS: {
            EXISTING: 0.8,
            NEW: 0.2,
        },
    },
};

/**
 * UI Constants
 */
export const UI_CONFIG = {
    SIDEBAR_WIDTH_PX: 280,
    MOBILE_BREAKPOINT_PX: 768,
    TABLET_BREAKPOINT_PX: 1024,

    ANIMATION_DURATION_MS: 300,
    DEBOUNCE_DELAY_MS: 500,

    TOAST_DURATION_MS: 3000,
    MODAL_ANIMATION_MS: 200,
};

/**
 * Pagination and Limits
 */
export const PAGINATION_CONFIG = {
    LEADERBOARD_PAGE_SIZE: 10,
    TEST_HISTORY_PAGE_SIZE: 20,
    NEWS_ITEMS_PER_PAGE: 15,

    MAX_RECENT_TESTS: 10,
    MAX_BOOKMARKS: 100,
};
