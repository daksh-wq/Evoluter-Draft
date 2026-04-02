/**
 * Detect if topic falls into Science/Tech/Environment category.
 * These subjects get boosted Application-Based and reduced Direct Factual.
 */
function isSciEnvTopic(topic) {
    if (!topic) return false;
    const lower = topic.toLowerCase();
    const keywords = [
        'science', 'technology', 'tech', 'environment', 'ecology',
        'biodiversity', 'climate', 'pollution', 'biotechnology', 'space',
        'nuclear', 'cyber', 'ai', 'artificial intelligence', 'nfc',
        'blockchain', 'iot', 'renewable', 'solar', 'wind energy',
        'genome', 'crispr', 'satellite', 'isro', 'nasa', 'conservation',
        'wildlife', 'forest', 'marine', 'ozone', 'greenhouse',
    ];
    return keywords.some(kw => lower.includes(kw));
}

/**
 * Build question-type distribution instruction for a given batch size.
 * Uses UPSC Prelims 2023+ "Modern Surge" weightage by default.
 *
 * Default weights (Modern Surge 2023+):
 *   Multi-Statement:  35%  (backbone — down from 49% avg to make room for Pair surge)
 *   Pair-Based:       25%  (surged from ~8% to 47% in 2023; we use 25% as a balanced modern default)
 *   Direct Factual:   12%  (declining trend)
 *   How Many:         12%  (rising trend, companion to Pair-Based)
 *   Conceptual/Applied: 8% (rising for Science/Env)
 *   Assertion-Reason:  5%  (resurgence in 2024-25)
 *   Definitional:      3%  (stable, niche)
 *
 * Science/Tech/Environment override:
 *   Application-Based boosted to 20%, Pair-Based trimmed to 18%
 *
 * @param {number} batchSize - Number of questions to generate
 * @param {string} [topic=''] - Topic string for subject-sensitive adjustment
 */
function buildTypeDistributionInstruction(batchSize, topic = '') {
    const isSciEnv = isSciEnvTopic(topic);

    // ── Compute counts ──────────────────────────────────────────────
    let multiStatement, pairBased, direct, howMany, application, ar, definitional;

    if (isSciEnv) {
        // Science/Tech/Environment — boost Application-Based
        multiStatement = Math.max(1, Math.round(batchSize * 0.30));
        pairBased      = Math.max(1, Math.round(batchSize * 0.18));
        direct         = Math.max(1, Math.round(batchSize * 0.08));
        howMany        = Math.max(1, Math.round(batchSize * 0.12));
        application    = Math.max(1, Math.round(batchSize * 0.20));
        ar             = Math.max(1, Math.round(batchSize * 0.07));
        definitional   = batchSize - multiStatement - pairBased - direct - howMany - application - ar;
    } else {
        // Standard Modern Surge (2023+)
        multiStatement = Math.max(1, Math.round(batchSize * 0.35));
        pairBased      = Math.max(1, Math.round(batchSize * 0.25));
        direct         = Math.max(1, Math.round(batchSize * 0.12));
        howMany        = Math.max(1, Math.round(batchSize * 0.12));
        application    = Math.max(1, Math.round(batchSize * 0.08));
        ar             = Math.max(1, Math.round(batchSize * 0.05));
        definitional   = batchSize - multiStatement - pairBased - direct - howMany - application - ar;
    }

    // Ensure definitional is at least 1 for batches >= 10
    if (definitional < 1 && batchSize >= 10) {
        definitional = 1;
        multiStatement = Math.max(1, multiStatement - 1);
    }

    // Sub-type splits
    const stmt2 = Math.round(multiStatement * 0.43); // ~21/49
    const stmt3 = multiStatement - stmt2;             // ~28/49
    const factCurrent = Math.round(direct * 0.36);    // ~8/22
    const factStatic  = direct - factCurrent;          // ~14/22
    const pairStandard = Math.max(0, Math.round(pairBased * 0.47)); // ~7/15
    const pairCounting = pairBased - pairStandard;                   // ~8/15

    const modeLabel = isSciEnv ? '⚗️ SCIENCE/TECH/ENVIRONMENT MODE (boosted Application-Based)' : '📊 MODERN SURGE MODE (2023+ UPSC Pattern)';

    return `
QUESTION TYPE ANATOMY — ${modeLabel}
STRICT ENFORCEMENT for this batch of ${batchSize} questions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. DIRECT FACTUAL / SINGLE STATEMENT: ${direct} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Sub-types:
   • Current Events / Organisation Names: ${factCurrent} questions
   • Static Definitions / Mapping / Locations: ${factStatic} questions
   Strategy: Recall.
   Example: "Which city is the largest producer of X?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. MULTI-STATEMENT QUESTIONS (STANDARD): ${multiStatement} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Sub-types:
   • 2-Statement Format: ${stmt2} questions — use exactly 2 statements
   • 3-Statement Format: ${stmt3} questions — use exactly 3 statements
   Strategy: Elimination.
   Options: "1 only", "1 and 2 only", "All of the above", etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PAIR-BASED FORMAT (NEW TREND — ELIMINATION KILLER): ${pairBased} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Sub-types:
   • Standard Match the Following: ${pairStandard} questions
     (List-I vs List-II with coded options like "1-A, 2-B, 3-C, 4-D")
   • Pair Counting ("How many pairs"): ${pairCounting} questions
     ⚠️ STRICT: DO NOT use "1-A, 2-B" codes for these.
     List 3 or 4 pairs. Options MUST BE EXACTLY:
       Option 0: "Only one pair is correctly matched"
       Option 1: "Only two pairs are correctly matched"
       Option 2: "Only three pairs are correctly matched"
       Option 3: "All four pairs are correctly matched"
   Strategy: Exhaustive Knowledge.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. STATEMENT-REASON (ASSERTION-REASONING): ${ar} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚠️ STRICT RULE: Use labels "Statement-I" and "Statement-II". DO NOT use "Assertion/Reason".
   Structure:
     Statement-I: [Principal claim]
     Statement-II: [Logical explanation]
   Strategy: Conceptual Linkage.
   Options MUST BE EXACTLY:
     Option 0: "Both Statement-I and Statement-II are correct and Statement-II is the correct explanation for Statement-I"
     Option 1: "Both Statement-I and Statement-II are correct but Statement-II is NOT the correct explanation for Statement-I"
     Option 2: "Statement-I is correct but Statement-II is incorrect"
     Option 3: "Statement-I is incorrect but Statement-II is correct"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. DEFINITIONAL / CONCEPTUAL: ${definitional} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Structure: "Which of the following BEST defines..." or "The most appropriate description of..."
   Strategy: Logic & Standard Texts.
   Example: "Which one of the following best defines the term 'State'?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. THE "HOW MANY" PATTERN: ${howMany} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Structure: List 4 items and ask "How many of the above are correct/true/X?"
   Strategy: Exhaustive Knowledge.
   Options MUST BE EXACTLY:
     Option 0: "Only one"
     Option 1: "Only two"
     Option 2: "Only three"
     Option 3: "All four"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. APPLICATION-BASED (SCIENCE & TECH / ENV): ${application} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Structure: Focus on "can", "may", or "use cases". Tests possibilities not just facts.
   Strategy: Possibility Analysis.
   Example: "With reference to NFC technology, which statements are correct?"
   Note: "All of the above" is often valid since technology capabilities are broad.

CRITICAL JSON FIELD: Each question MUST include a "strategy" string field (from: Recall, Elimination, Exhaustive Knowledge, Conceptual Linkage, Logic & Standard Texts, Possibility Analysis).
`;
}

/**
 * Returns the question type label for a given question's questionType field.
 * Helps normalise how question types are stored.
 */
const QUESTION_TYPE_LABELS = {
    'Direct Factual': 'Direct Factual',
    'Multi-Statement (Standard)': 'Multi-Statement (Standard)',
    'Pair-Based': 'Pair-Based',
    'Assertion-Reason': 'Assertion-Reason',
    'Definitional': 'Definitional',
    'How Many': 'How Many',
    'Application-Based': 'Application-Based',
};

/** 3-layer solution instruction injected into every prompt. */
const THREE_LAYER_SOLUTION_INSTRUCTION = `
SOLUTION FORMAT (mandatory for EVERY question):
"solution": {
  "correctAnswerReason": "ONE sentence only — state the key fact that makes the correct answer correct. DO NOT write paragraphs. DO NOT explain wrong options. DO NOT write what mistake students make.",
  "sourceOfQuestion": "PINPOINT reference — be VERY specific. Examples: 'M. Laxmikanth — Indian Polity, Ch. 12 (President)', 'NCERT Class 12 History Ch. 3 — Kinship, Caste and Class', 'Indian Constitution — Article 370', 'Economic Survey 2023-24, Ch. 5'. DO NOT write vague references like 'Standard Book' or 'NCERT'. Always include chapter number or article number.",
  "approachToSolve": "KEY WORD / KEY FACT only — the single piece of information a student needs to instantly identify the correct answer. Max 15 words. Example: 'Key: 42nd Amendment 1976 added Secular and Socialist to Preamble.' or 'Key: Article 32 = Heart of Constitution per Ambedkar.' DO NOT explain HOW to eliminate options."
}
`;

/** Tagging instruction injected into every prompt so AI self-classifies each question. */
const TAGGING_INSTRUCTION = `
TAGGING FIELDS (mandatory for EVERY question — use the exact codes below):
"subjectCode": one of [PC, IE, GE, ST, IR, AC, EN, AH, MH, MO]

"topicCode": 2-digit string representing the specific sub-topic based STRICTLY on the subject you select. Treat this as a lookup table:
- IF subject is PC (Polity & Constitution): [01: Constitutional Framework, 02: Rights & Duties, 03: Union & State Executive, 04: Union & State Legislature, 05: Judiciary, 06: Local Government, 07: Federalism & Relations, 08: Bodies & Provisions]
- IF subject is IE (Indian Economy): [01: National Income & Accounting, 02: Fiscal Policy & Budgeting, 03: Monetary Policy & Banking, 04: External Sector, 05: Financial Markets, 06: Social Sector & Poverty, 07: Sectors of Economy, 08: International Organizations]
- IF subject is GE (Geography): [01: Geomorphology, 02: Climatology, 03: Oceanography & Hydrology, 04: Human Geography, 05: Indian Physical Geography, 06: Biogeography, 07: Economic Geography, 08: Mapping]
- IF subject is ST (Science & Technology): [01: Space Technology & Astronomy, 02: Biotechnology & Health, 03: IT, Computing & Electronics, 04: General Science – Physics, Chemistry, Biology, 05: Defense Technology]
- IF subject is IR (International Relations): [01: Bilateral Relations, 02: Global Groupings, 03: Global Institutions]
- IF subject is AC (Art & Culture): [01: Indian Architecture, 02: Sculptures of India, 03: Indian Paintings, 04: Indian Music and Dance Forms, 05: Theatres & Puppetry, Calendars, Fairs & Festivals, 06: Literary Arts & Philosophy]
- IF subject is EN (Environment): [01: Ecology Basics & Ecosystems, 02: Ecosystem Functions, 03: Terrestrial & Aquatic Biomes, 04: Biodiversity & Species, 05: Protected Area Network (PAN), 06: Climate Change & Mitigation, 07: Pollution & Waste Management, 08: Environmental Governance & Acts]
- IF subject is AH (Ancient History): [01: Pre-Historic & Indus Valley Civilization, 02: Vedic Culture & Religious Movements, 03: The Mauryan Empire, 04: Post-Mauryan & Sangam Age, 05: Gupta & Post-Gupta Era, 06: South Indian Kingdoms, 07: Ancient Art & Culture]
- IF subject is MH (Medieval History): [01: Early Medieval India, 02: Rajput Era & Early Invasions, 03: Delhi Sultanate, 04: Bhakti & Sufi Movements, 05: Vijayanagar & Bahmani Empires, 06: Mughal Empire, 07: Maratha Empire, 08: Medieval Art & Architecture]
- IF subject is MO (Modern History): [01: Expansion of British Power, 02: British Policies & Admin, 03: Early Resistance & 1857, 04: Socio-Religious Reforms, 05: Early National Movement, 06: Gandhian Era & Mass Movements, 07: Constitutional Evolution, 08: Independence & Beyond]

"sourceCode":  one of [SN=Standard/NCERT, AD=Advanced/official-docs, CI=Current-Issue, RN=Random, NA=Not-Applicable]
"typeCode":    one of [DF=Direct-Factual, MS=Multi-Statement, PB=Pair-Based, SR=Statement-Reason, DE=Definitional, HM=How-Many, AB=Application-Based]
"difficultyCode": one of [ET=Extreme-Tough, TO=Tough, ME=Medium, ES=Easy, FO=Foundational]
"pyqCode":     one of [CS=CSE, CD=CDSE, ND=NDA, CI=CISF, CP=CAPF, NA=Not-Applicable]
`;

/**
 * Parse AI JSON response with fallback regex extraction.
 * @param {string} responseText - Raw AI response text
 * @param {'array'|'object'} expectedType - Expected JSON type
 * @returns {Array|Object} Parsed JSON
 * @throws {Error} If parsing fails
 */
function parseAIJsonResponse(responseText, expectedType = 'array') {
    // Try direct parse first
    try {
        const parsed = JSON.parse(responseText);
        if (expectedType === 'array' && Array.isArray(parsed)) return parsed;
        if (expectedType === 'object' && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        // If type doesn't match, still return — caller can validate
        return parsed;
    } catch {
        // Fallback: extract JSON with regex
        const pattern = expectedType === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
        const match = responseText.match(pattern);
        if (match) {
            return JSON.parse(match[0]);
        }
        throw new Error(`Failed to parse AI ${expectedType} response`);
    }
}

/**
 * Sanitize user input before injecting into AI prompts.
 * Strips control characters, limits length, escapes backticks.
 * @param {string} text - Raw user input
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text
 */
function sanitizeForPrompt(text, maxLength = 500) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
        .replace(/`/g, "'")               // Escape backticks (prevent prompt injection via code blocks)
        .trim()
        .substring(0, maxLength);
}

module.exports = {
    buildTypeDistributionInstruction,
    THREE_LAYER_SOLUTION_INSTRUCTION,
    TAGGING_INSTRUCTION,
    QUESTION_TYPE_LABELS,
    parseAIJsonResponse,
    sanitizeForPrompt,
};
