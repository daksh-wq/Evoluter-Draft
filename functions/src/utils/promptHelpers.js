/**
 * Shared Prompt Helpers — Centralized AI prompt building utilities
 * Eliminates duplication between testGeneration.js and pdfProcessing.js
 */

/**
 * Build question-type distribution instruction for a given batch size.
 * Mirrors UPSC/competitive exam paper patterns.
 *
 * Quality rules enforced:
 *  - Statement-based: answer must be distributed evenly (not always "All correct")
 *  - A&R: answer must be distributed across all 4 options (not always Option A)
 *  - One-liner questions explicitly included
 *  - Complex 3-statement A&R sub-format included
 */
function buildTypeDistributionInstruction(batchSize) {
    // Type counts
    const statement   = Math.round(batchSize * 0.35); // slight reduction to fit one-liners
    const ar          = Math.round(batchSize * 0.25);
    const matching    = Math.round(batchSize * 0.15);
    const oneLiner    = Math.round(batchSize * 0.10);
    const direct      = batchSize - statement - ar - matching - oneLiner;

    // Statement-based: force answer spread. Divide statement count into 4 equal buckets.
    const stmtPerBucket   = Math.max(1, Math.floor(statement / 4));
    const stmtOnlyOne     = stmtPerBucket;
    const stmtOnlyTwo     = stmtPerBucket;
    const stmtOnlyThree   = stmtPerBucket;
    const stmtAll         = statement - stmtOnlyOne - stmtOnlyTwo - stmtOnlyThree;

    // A&R: force answer spread across all 4 options.
    const arPerBucket = Math.max(1, Math.floor(ar / 4));
    const arOptA      = arPerBucket;                        // Both A&R correct, R explains A
    const arOptB      = arPerBucket;                        // Both A&R correct, R does NOT explain A
    const arOptC      = arPerBucket;                        // A is correct, R is incorrect
    const arOptD      = ar - arOptA - arOptB - arOptC;      // A is incorrect, R is correct

    // Complex 3-statement A&R: at least 1 if ar >= 4
    const complexAR = ar >= 4 ? Math.max(1, Math.round(ar * 0.25)) : 0;

    return `
QUESTION TYPE DISTRIBUTION (strictly follow for this batch of ${batchSize} questions):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. STATEMENT-BASED QUESTIONS: ${statement} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Format: "Consider the following statements: 1. ... 2. ... 3. ... Which of the statements given above is/are CORRECT?"
   Options MUST be:
     Option 0: "Only statement 1"  (or "Only 1 and 2" etc.)
     Option 1: "Only statements 1 and 2"
     Option 2: "Only statements 2 and 3" (or "Only 1 and 3" etc.)
     Option 3: "All of the above" (or "None of the above")

   ⚠️ ANSWER DISTRIBUTION RULE — STRICTLY ENFORCE:
   - ${stmtOnlyOne} question(s) must have correctAnswer = 0  (Only one statement is correct)
   - ${stmtOnlyTwo} question(s) must have correctAnswer = 1  (Only two statements are correct)
   - ${stmtOnlyThree} question(s) must have correctAnswer = 2  (Only three / a specific pair are correct)
   - ${stmtAll} question(s) must have correctAnswer = 3  (All statements are correct)
   DO NOT make all statement-based questions have "All of the above" as the answer. Distribute evenly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. ASSERTION-REASONING QUESTIONS: ${ar} total (including ${complexAR} Complex 3-statement A&R)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Standard A&R format:
     "Assertion (A): [factual statement]
      Reason (R): [explanatory statement]"
   Options MUST always be in this exact order:
     Option 0: "Both A and R are correct and R is the correct explanation of A"
     Option 1: "Both A and R are correct but R is NOT the correct explanation of A"
     Option 2: "A is correct but R is incorrect"
     Option 3: "A is incorrect but R is correct"

   ⚠️ ANSWER DISTRIBUTION RULE — STRICTLY ENFORCE:
   - ${arOptA} question(s) must have correctAnswer = 0  (Both correct, R explains A)
   - ${arOptB} question(s) must have correctAnswer = 1  (Both correct, R doesn't explain A)
   - ${arOptC} question(s) must have correctAnswer = 2  (A correct, R wrong)
   - ${arOptD} question(s) must have correctAnswer = 3  (A wrong, R correct)
   DO NOT make all A&R questions have correctAnswer = 0. Distribute evenly across all 4 options.

   Complex 3-Statement A&R (${complexAR} of the ${ar}):
     Use THREE Assertions (A1, A2, A3) and ONE Reason. Example:
     "Assertion 1 (A1): ...
      Assertion 2 (A2): ...
      Assertion 3 (A3): ...
      Reason (R): ..."
     Options should reflect which assertions R explains:
       Option 0: "R correctly explains A1 and A2 only"
       Option 1: "R correctly explains A2 and A3 only"
       Option 2: "R correctly explains all three assertions"
       Option 3: "R does not correctly explain any assertion"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. MATCHING/PAIR-BASED QUESTIONS: ${matching} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CRITICAL: The "text" field MUST contain both lists clearly formatted using newlines.
   STRICTLY limit List-I to exactly 4 items (1, 2, 3, 4) and List-II to exactly 4 items (A, B, C, D).
   Do NOT add extra items like E, F, etc.
   Example format:
   Match List-I with List-II:
   List-I:
   1. Item 1
   2. Item 2
   3. Item 3
   4. Item 4
   List-II:
   A. Desc A
   B. Desc B
   C. Desc C
   D. Desc D

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. ONE-LINER (DIRECT) QUESTIONS: ${oneLiner} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Short, factual recall — one sentence question. Examples:
   "The term 'Secular' was added to the Constitution by which Amendment?"
   "Who was the first Governor General of independent India?"
   "Which Article of the Constitution deals with the Right to Education?"
   Answer should be a single clear fact. Keep question text under 20 words.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. DIRECT FACTUAL/ANALYTICAL QUESTIONS: ${direct} total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   e.g., "Which of the following is NOT correct regarding..."
   These may use negative framing, multi-correct elimination logic, etc.

CRITICAL OPTION FORMATTING RULE:
For the "options" JSON array ONLY: DO NOT prefix options with A), B), C), D), 1., 2., etc. The options array must contain ONLY the raw option text.
BAD: ["A) 1-B, 2-A", "B) 1-A, 2-B"]
GOOD: ["1-B, 2-A", "1-A, 2-B"]
NOTE: You MAY use A., B., 1., 2. inside the question "text" field for List-I/List-II and A&R format.`;
}

/**
 * Returns the question type label for a given question's questionType field.
 * Helps normalise how question types are stored.
 */
const QUESTION_TYPE_LABELS = {
    'Statement-based': 'Statement-based',
    'Assertion-Reasoning': 'Assertion-Reasoning',
    'Assertion-Reasoning-Complex': 'Assertion-Reasoning-Complex',
    'Matching': 'Matching',
    'One-liner': 'One-liner',
    'Direct Factual': 'Direct Factual',
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
"typeCode":    one of [FA=Factual, CO=Conceptual, AB=Application-Based, DE=Definition, IN=Informative]
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
