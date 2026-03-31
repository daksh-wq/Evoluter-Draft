export const SUBJECTS = [
    'All Subjects',
    'Polity & Constitution',
    'Indian Economy',
    'Geography',
    'Science & Technology',
    'International Relations',
    'Art & Culture',
    'Environment',
    'Ancient & Medieval History',
    'Modern History'
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
    'All Subjects': 'MX',
    'Polity & Constitution': 'PC',
    'Indian Economy': 'IE',
    'Geography': 'GE',
    'Science & Technology': 'ST',
    'International Relations': 'IR',
    'Art & Culture': 'AC',
    'Environment': 'EN',
    'Ancient & Medieval History': 'AM',
    'Modern History': 'MO'
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
    PC: {
        '01': 'Constitutional Framework',
        '02': 'Rights & Duties',
        '03': 'Union & State Executive',
        '04': 'Union & State Legislature',
        '05': 'Judiciary',
        '06': 'Local Government',
        '07': 'Federalism & Relations',
        '08': 'Bodies & Provisions',
    },
    IE: {
        '01': 'National Income & Accounting',
        '02': 'Fiscal Policy & Budgeting',
        '03': 'Monetary Policy & Banking',
        '04': 'External Sector',
        '05': 'Financial Markets',
        '06': 'Social Sector & Poverty',
        '07': 'Sectors of Economy',
        '08': 'International Organizations',
    },
    GE: {
        '01': 'Geomorphology',
        '02': 'Climatology',
        '03': 'Oceanography & Hydrology',
        '04': 'Human Geography',
        '05': 'Indian Physical Geography',
        '06': 'Biogeography',
        '07': 'Economic Geography',
        '08': 'Mapping',
    },
    ST: {
        '01': 'Space Technology & Astronomy',
        '02': 'Biotechnology & Health',
        '03': 'IT, Computing & Electronics',
        '04': 'General Science – Physics, Chemistry, Biology',
        '05': 'Defense Technology',
    },
    IR: {
        '01': 'Bilateral Relations',
        '02': 'Global Groupings',
        '03': 'Global Institutions',
    },
    AC: {
        '01': 'Indian Architecture',
        '02': 'Sculptures of India',
        '03': 'Indian Paintings',
        '04': 'Indian Music and Dance Forms',
        '05': 'Theatres & Puppetry, Calendars, Fairs & Festivals',
        '06': 'Literary Arts & Philosophy',
    },
    EN: {
        '01': 'Ecology Basics & Ecosystems',
        '02': 'Ecosystem Functions',
        '03': 'Terrestrial & Aquatic Biomes',
        '04': 'Biodiversity & Species',
        '05': 'Protected Area Network (PAN)',
        '06': 'Climate Change & Mitigation',
        '07': 'Pollution & Waste Management',
        '08': 'Environmental Governance & Acts',
    },
    AM: {
        // ── Ancient History ──────────────────────────────
        '01': 'Pre-Historic & Indus Valley Civilization',
        '02': 'Vedic Culture & Religious Movements',
        '03': 'The Mauryan Empire',
        '04': 'Post-Mauryan & Sangam Age',
        '05': 'Gupta & Post-Gupta Era',
        '06': 'South Indian Kingdoms',
        '07': 'Ancient Art & Culture',
        // ── Medieval History ─────────────────────────────
        '08': 'Early Medieval India',
        '09': 'Rajput Era & Early Invasions',
        '10': 'Delhi Sultanate',
        '11': 'Bhakti & Sufi Movements',
        '12': 'Vijayanagar & Bahmani Empires',
        '13': 'Mughal Empire',
        '14': 'Maratha Empire',
        '15': 'Medieval Art & Architecture',
    },
    MO: {
        '01': 'Expansion of British Power',
        '02': 'British Policies & Admin',
        '03': 'Early Resistance & 1857',
        '04': 'Socio-Religious Reforms',
        '05': 'Early National Movement',
        '06': 'Gandhian Era & Mass Movements',
        '07': 'Constitutional Evolution',
        '08': 'Independence & Beyond',
    }
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
    'Polity & Constitution': {
        core: ['NCERT Class 11 — Indian Constitution at Work', 'NCERT Political Theory'],
        standard: ['Indian Polity by M. Laxmikanth'],
        advanced: ['Constitution of India by D.D. Basu', 'Constitution Bare Act', '2nd ARC Report'],
    },
    'Ancient & Medieval History': {
        core: ['Old NCERT — Ancient India by R.S. Sharma', 'NCERT Medieval India by Satish Chandra'],
        standard: ['Standard Textbooks'],
        advanced: ['Advanced Historical Research'],
    },

    'Modern History': {
        core: ['NCERT Class XII — Themes in Modern Indian History', 'Modern India by Bipin Chandra'],
        standard: ['Spectrum — History of Modern India'],
        advanced: ["India's Struggle for Independence by Bipin Chandra"],
    },
    'Art & Culture': {
        core: ['NCERT Class XI — An Introduction to Indian Art'],
        standard: ['Indian Art and Culture by Nitin Singhania'],
        advanced: ['CCRT (Centre for Cultural Resources and Training) material'],
    },
    'Geography': {
        core: ['NCERT Class 11 — Fundamental of Physical Geography', 'India Physical Environment'],
        standard: ['Certificate in Physical and Human Geography by G.C. Leong'],
        advanced: ['Geography by Majid Hussain'],
    },
    'Indian Economy': {
        core: ['NCERT Class X, XI (Indian Economic Development)', 'NCERT Class XII (Introductory Macroeconomics)'],
        standard: ['Indian Economy by Ramesh Singh', 'Indian Economy by Sanjeev Verma'],
        advanced: ['Economic Survey', 'Union Budget Document'],
    },
    'Environment': {
        core: ['NCERT Class XII Biology — Ch 13 to 16'],
        standard: ['PMF IAS Environment Material'],
        advanced: ['Ministry of Environment Reports', 'Down to Earth', 'Yojana'],
    },
    'Science & Technology': {
        core: ['NCERT Class VI–X'],
        standard: ['TMH Science and Technology Book'],
        advanced: ['Newspapers & Current Science Publications'],
    },
    'International Relations': {
        core: ['Standard Textbooks', 'Newspapers'],
        standard: ['Ministry of External Affairs Updates', 'Diplomatic Periodicals'],
        advanced: ['Think Tank Reports (ORF, IDSA)'],
    }
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
