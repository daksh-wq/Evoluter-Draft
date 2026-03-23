export const SUBJECTS = [
    'All',
    'Polity',
    'History',
    'Art and Culture',
    'Geography',
    'Economy',
    'Environment',
    'Science and Technology'
];

export const DIFFICULTY_LEVELS = ['Easy', 'Intermediate', 'Hard'];

export const QUESTION_COUNTS = [10, 25, 50, 100];

export const DEFAULT_AI_TOPIC = '';
export const DEFAULT_QUESTION_COUNT = 25;
export const DEFAULT_DIFFICULTY = 'Intermediate';

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
 * Fixed test duration (in seconds) enforced by question count.
 * These are the official, non-negotiable time limits:
 *   10 Q → 15 min | 25 Q → 30 min | 50 Q → 60 min | 100 Q → 120 min
 */
export const DURATION_BY_COUNT = {
    10: 15 * 60,   //  900 seconds
    25: 30 * 60,   // 1800 seconds
    50: 60 * 60,   // 3600 seconds
    100: 120 * 60,  // 7200 seconds
};

/**
 * Returns the enforced duration in seconds for a given question count.
 * Snaps to the nearest bracket (10/25/50/100).
 * Falls back to 90 s/Q for any non-standard counts.
 */
export function getDurationForCount(count) {
    // Exact match first
    if (DURATION_BY_COUNT[count] !== undefined) return DURATION_BY_COUNT[count];

    // Snap to the nearest defined bracket
    const brackets = Object.keys(DURATION_BY_COUNT).map(Number).sort((a, b) => a - b);
    for (const bracket of brackets) {
        if (count <= bracket) return DURATION_BY_COUNT[bracket];
    }
    // Above 100 — scale linearly from the 100-question rate (72 s/Q)
    return Math.round(count * 72);
}

/**
 * Question type distribution targets per batch.
 * Mirrors UPSC/competitive exam real paper patterns.
 */
export const QUESTION_TYPE_DISTRIBUTION = {
    statement: { label: 'Statement-based', share: 0.45 },
    assertionReasoning: { label: 'Assertion-Reasoning', share: 0.25 },
    matching: { label: 'Matching/Pair-based', share: 0.20 },
    direct: { label: 'Direct Factual', share: 0.10 }
};

// ─── Question Bank Tagging System (texr spec) ────────────────────────────────

/**
 * Subject → 2-letter alphabetic code.
 * Segment 1 of the 16-char Question ID.
 */
export const SUBJECT_CODES = {
    'All': 'MX',
    'Polity': 'PO',
    'History': 'HI',
    'Art and Culture': 'AC',
    'Geography': 'GE',
    'Economy': 'EC',
    'Environment': 'EN',
    'Science and Technology': 'ST'
};

/** Reverse map: code → subject name */
export const SUBJECT_CODE_TO_NAME = Object.fromEntries(
    Object.entries(SUBJECT_CODES).map(([name, code]) => [code, name])
);

/**
 * Topic codes per subject — 2-digit numeric.
 * Segment 2 of the 16-char Question ID.
 * Format: { subjectCode: { topicCode: topicName } }
 */
export const TOPIC_CODES = {
    PO: {
        '01': 'Constitutional Fundamentals',
        '02': 'Core Rights (FR, DPSP, FD)',
        '03': 'Union Executive',
        '04': 'Union Legislature (Parliament)',
        '05': 'Judiciary & Judicial Review',
        '06': 'Federal Structure & Centre-State',
        '07': 'State & Local Governance',
        '08': 'Constitutional Bodies',
        '09': 'Governance & Rights',
    },
    HI: {
        '01': 'Indus Valley & Vedic Period',
        '02': 'Mahajanapadas & Magadhan Ascendancy',
        '03': 'Heterodox Sects (Buddhism & Jainism)',
        '04': 'Mauryan & Post-Mauryan Period',
        '05': 'Gupta & Post-Gupta Period',
        '06': 'Delhi Sultanate (1206-1526)',
        '07': 'Mughal Empire (1526-1707)',
        '08': 'Colonial Expansion',
        '09': 'Administrative & Social Changes',
        '10': 'Early Resistance (Pre-1857)',
        '11': 'Rise of Nationalism (1885-1905)',
        '12': 'Extremist & Revolutionary Phase',
        '13': 'The Gandhian Era (1919-1947)',
        '14': 'Constitutional Developments',
        '15': 'Towards Independence & Partition',
    },
    AC: {
        '01': 'Ancient Architecture & Sculpture',
        '02': 'Rock-Cut & Cave Architecture',
        '03': 'Temple Architecture',
        '04': 'Indo-Islamic Architecture',
        '05': 'Classical Performing Arts',
        '06': 'Folk Arts & Crafts',
        '07': 'Philosophy & Literature',
        '08': 'Bhakti and Sufi Movements',
    },
    GE: {
        '01': 'Geomorphology & Lithosphere',
        '02': 'Climatology & Atmosphere',
        '03': 'Oceanography & Hydrosphere',
        '04': 'Indian Physiography',
        '05': 'Indian Climate & Monsoon',
        '06': 'Indian Resources & Agriculture',
        '07': 'Human & Economic Geography',
    },
    EC: {
        '01': 'Basic Concepts & National Income',
        '02': 'Inflation & Monetary Policy',
        '03': 'Public Finance & Taxation',
        '04': 'Banking & Financial Markets',
        '05': 'External Sector',
        '06': 'Sectoral Issues & Reforms',
        '07': 'Poverty, Unemployment & Schemes',
    },
    EN: {
        '01': 'Basic Ecology',
        '02': 'Biodiversity',
        '03': 'Conservation Initiatives (India)',
        '04': 'Pollution & Waste Management',
        '05': 'Climate Change',
        '06': 'International Treaties',
        '07': 'Institutions & Governance',
    },
    ST: {
        '01': 'Space Technology',
        '02': 'Biotechnology & Health',
        '03': 'IT & Digital Tech',
        '04': 'Defence & Nuclear',
        '05': 'Basic Science',
    },
};

/**
 * Source of question — 2-letter alphabetic code.
 * Segment 3 of the 16-char Question ID.
 */
export const SOURCE_CODES = {
    Standard: 'SN',   // NCERT / standard textbooks
    Advanced: 'AD',   // Economic Survey, official docs, D.D. Basu
    Random: 'RN',   // Cannot be categorized
    'Current Issue': 'CI',   // Well-covered in current affairs
    'Not Applicable': 'NA',   // Cannot be identified
};

export const SOURCE_CODE_TO_NAME = Object.fromEntries(
    Object.entries(SOURCE_CODES).map(([name, code]) => [code, name])
);

/**
 * Books per subject (Core / Standard / Advanced) — for source classification.
 */
export const SUBJECT_SOURCE_MAP = {
    'Polity': {
        core: ['NCERT Class 11 — Indian Constitution at Work', 'NCERT Political Theory'],
        standard: ['Indian Polity by M. Laxmikanth'],
        advanced: ['Constitution of India by D.D. Basu', 'Constitution Bare Act', '2nd ARC Report'],
    },
    'History': {
        core: ['NCERT Class XII — Themes in Indian History Part I & II', 'Modern India by Bipin Chandra (Old NCERT)'],
        standard: ['Old NCERT — Ancient India by R.S. Sharma', 'Medieval India by Satish Chandra', 'Spectrum — History of Modern India'],
        advanced: ["India's Struggle for Independence by Bipin Chandra"],
    },
    'Art and Culture': {
        core: ['NCERT Class XI — An Introduction to Indian Art'],
        standard: ['Indian Art and Culture by Nitin Singhania'],
        advanced: ['CCRT (Centre for Cultural Resources and Training) material'],
    },
    'Geography': {
        core: ['NCERT Class 11 — Fundamental of Physical Geography', 'India Physical Environment'],
        standard: ['Certificate in Physical and Human Geography by G.C. Leong'],
        advanced: ['Geography by Majid Hussain'],
    },
    'Economy': {
        core: ['NCERT Class X, XI (Indian Economic Development)', 'NCERT Class XII (Introductory Macroeconomics)'],
        standard: ['Indian Economy by Ramesh Singh', 'Indian Economy by Sanjeev Verma'],
        advanced: ['Economic Survey', 'Union Budget Document'],
    },
    'Environment': {
        core: ['NCERT Class XII Biology — Ch 13 to 16'],
        standard: ['PMF IAS Environment Material'],
        advanced: ['Ministry of Environment Reports', 'Down to Earth', 'Yojana'],
    },
    'Science and Technology': {
        core: ['NCERT Class VI–X'],
        standard: ['TMH Science and Technology Book'],
        advanced: ['Newspapers & Current Science Publications'],
    },
};

/**
 * Nature/type of the question — 2-letter alphabetic code.
 * Segment 4 of the 16-char Question ID.
 */
export const QUESTION_TYPE_CODES = {
    Factual: 'FA',
    Conceptual: 'CO',
    'Application Based': 'AB',
    Definition: 'DE',
    Informative: 'IN',
};

export const QUESTION_TYPE_CODE_TO_NAME = Object.fromEntries(
    Object.entries(QUESTION_TYPE_CODES).map(([name, code]) => [code, name])
);

/**
 * Difficulty level of the question — 2-letter alphabetic code.
 * Segment 5 of the 16-char Question ID.
 * Note: These are finer-grained than the existing Easy/Intermediate/Hard AI difficulty.
 */
export const DIFFICULTY_CODES = {
    'Extreme Tough': 'ET',
    'Tough': 'TO',
    'Medium': 'ME',
    'Easy': 'ES',
    'Foundational': 'FO',
};

export const DIFFICULTY_CODE_TO_NAME = Object.fromEntries(
    Object.entries(DIFFICULTY_CODES).map(([name, code]) => [code, name])
);

/** Map AI difficulty labels → tag difficulty codes */
export const AI_DIFFICULTY_TO_CODE = {
    Hard: 'TO',
    Intermediate: 'ME',
    Easy: 'ES',
};

/**
 * PYQ (Previous Year Question) exam identification — 2-letter alphabetic code.
 * Segment 6 of the 16-char Question ID.
 */
export const PYQ_CODES = {
    'CSE': 'CS',   // UPSC Civil Services Exam
    'CDSE': 'CD',   // Combined Defence Services Exam
    'NDA': 'ND',   // National Defence Academy
    'CISF': 'CI',   // CISF AC (EXE) LDCE
    'CAPF': 'CP',   // Central Armed Police Forces
    'Not Applicable': 'NA',   // Not a PYQ
};

export const PYQ_CODE_TO_NAME = Object.fromEntries(
    Object.entries(PYQ_CODES).map(([name, code]) => [code, name])
);
