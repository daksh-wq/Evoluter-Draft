export const SUBJECTS = [
    'Indian History',
    'Indian Polity',
    'Geography',
    'Economy',
    'Environment',
    'Science & Tech',
    'Current Affairs'
];

export const DIFFICULTY_LEVELS = ['Easy', 'Intermediate', 'Hard'];

export const QUESTION_COUNTS = [10, 25, 50, 100];

export const DEFAULT_AI_TOPIC = '';
export const DEFAULT_QUESTION_COUNT = 10;
export const DEFAULT_DIFFICULTY = 'Hard';

export const AI_CONFIG = {
    BATCH_SIZE: 10,
    MAX_RETRIES: 3,
    RETRY_DELAYS: [500, 1000, 2000]
};

/**
 * Time allowed per question (in seconds) based on difficulty.
 * Hard questions (e.g., A-R, Matching) need more reading time.
 */
export const TIME_PER_QUESTION = {
    Easy: 60,        // 1 min/Q  → 100 Q = ~100 min
    Intermediate: 90, // 1.5 min/Q → 100 Q = ~150 min
    Hard: 120        // 2 min/Q  → 100 Q = ~200 min (UPSC Prelims standard)
};

/**
 * Question type distribution targets per batch.
 * Mirrors UPSC/competitive exam real paper patterns.
 */
export const QUESTION_TYPE_DISTRIBUTION = {
    statement:         { label: 'Statement-based',      share: 0.45 },
    assertionReasoning:{ label: 'Assertion-Reasoning',  share: 0.25 },
    matching:          { label: 'Matching/Pair-based',  share: 0.20 },
    direct:            { label: 'Direct Factual',       share: 0.10 }
};
