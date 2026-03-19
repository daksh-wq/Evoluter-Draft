/**
 * Shared Prompt Helpers — Centralized AI prompt building utilities
 * Eliminates duplication between testGeneration.js and pdfProcessing.js
 */

/**
 * Build question-type distribution instruction for a given batch size.
 * Mirrors UPSC/competitive exam paper patterns.
 */
function buildTypeDistributionInstruction(batchSize) {
    const statement = Math.round(batchSize * 0.45);
    const ar        = Math.round(batchSize * 0.25);
    const matching  = Math.round(batchSize * 0.20);
    const direct    = batchSize - statement - ar - matching;

    return `
QUESTION TYPE DISTRIBUTION (strictly follow for this batch):
- ${statement} Statement-based questions (e.g., "Which of the following statements is/are correct?")
- ${ar} Assertion-Reasoning questions (Format: "Assertion (A): ... Reason (R): ..." with options like "Both A and R are correct and R is the correct explanation of A")
- ${matching} Matching/Pair-based questions. CRITICAL: The "text" field MUST contain both lists clearly formatted using newlines. STRICTLY limit List-I to exactly 4 items (1, 2, 3, 4) and List-II to exactly 4 items (A, B, C, D). Do NOT add extra items like E, F, etc.
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
- ${direct} Direct Factual questions (e.g., "Which of the following is NOT correct regarding...")

CRITICAL OPTION FORMATTING RULE:
For the "options" JSON array ONLY: DO NOT prefix options with A), B), C), D), 1., 2., etc. The options array must contain ONLY the raw option text.
BAD: ["A) 1-B, 2-A", "B) 1-A, 2-B"]
GOOD: ["1-B, 2-A", "1-A, 2-B"]
NOTE: You MAY use A., B., 1., 2. inside the question "text" field for List-I and List-II.`;
}

/** 3-layer solution instruction injected into every prompt. */
const THREE_LAYER_SOLUTION_INSTRUCTION = `
SOLUTION FORMAT (mandatory for EVERY question):
"solution": {
  "correctAnswerReason": "Concise explanation of WHY the correct option is correct (1-2 sentences)",
  "sourceOfQuestion": "Reference: e.g., 'NCERT Class 12 History Ch.4', 'Article 370', 'Economic Survey 2023'",
  "approachToSolve": "Strategy to eliminate wrong options and identify the correct answer"
}
`;

/** Tagging instruction injected into every prompt so AI self-classifies each question. */
const TAGGING_INSTRUCTION = `
TAGGING FIELDS (mandatory for EVERY question — use the exact codes below):
"subjectCode": one of [IP, AM, MI, IC, GE, EI, EN, ST, CA, TR]
"topicCode":   2-digit string e.g. "02" (best matching sub-topic number within the subject)
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
    parseAIJsonResponse,
    sanitizeForPrompt,
};
