/**
 * Question Bank Tagging Utilities
 *
 * Implements the 16-character unique question ID system from the texr spec:
 *   Format: AA-00-BB-CC-DD-EE-0000
 *   AA   = Subject code       (2-char alphabetic)
 *   00   = Topic code         (2-char numeric)
 *   BB   = Source code        (2-char alphabetic)
 *   CC   = Question type code (2-char alphabetic)
 *   DD   = Difficulty code    (2-char alphabetic)
 *   EE   = PYQ exam code      (2-char alphabetic)
 *   0000 = Serial number      (4-char zero-padded numeric, 0001–9999)
 *
 * Example: IP-02-SN-FA-ME-NA-0023
 *   = Indian Polity / Core Rights / Standard / Factual / Medium / Not a PYQ / #23
 */

import {
    SUBJECT_CODES,
    SUBJECT_CODE_TO_NAME,
    TOPIC_CODES,
    SOURCE_CODES,
    SOURCE_CODE_TO_NAME,
    QUESTION_TYPE_CODES,
    QUESTION_TYPE_CODE_TO_NAME,
    DIFFICULTY_CODES,
    DIFFICULTY_CODE_TO_NAME,
    AI_DIFFICULTY_TO_CODE,
    PYQ_CODES,
    PYQ_CODE_TO_NAME,
    SUBJECT_SOURCE_MAP,
} from '../constants/appConstants';

// ─── ID Generation ────────────────────────────────────────────────────────────

/**
 * Build the 16-char question ID string.
 *
 * @param {string} subjectCode  e.g. "IP"
 * @param {string} topicCode    e.g. "02"
 * @param {string} sourceCode   e.g. "SN"
 * @param {string} typeCode     e.g. "FA"
 * @param {string} diffCode     e.g. "ME"
 * @param {string} pyqCode      e.g. "NA"
 * @param {number} serial       e.g. 23
 * @returns {string}            e.g. "IP-02-SN-FA-ME-NA-0023"
 */
export function generateQuestionId(subjectCode, topicCode, sourceCode, typeCode, diffCode, pyqCode, serial) {
    const serialStr = String(serial).padStart(4, '0');
    return `${subjectCode}-${topicCode}-${sourceCode}-${typeCode}-${diffCode}-${pyqCode}-${serialStr}`;
}

/**
 * Decode a 16-char question ID back into human-readable labels.
 *
 * @param {string} questionId  e.g. "IP-02-SN-FA-ME-NA-0023"
 * @returns {object|null}      decoded labels, or null if invalid format
 */
export function decodeQuestionId(questionId) {
    if (!questionId || typeof questionId !== 'string') return null;

    const parts = questionId.split('-');
    // Expected: [subjectCode, topicCode, sourceCode, typeCode, diffCode, pyqCode, serial]
    if (parts.length !== 7) return null;

    const [subjectCode, topicCode, sourceCode, typeCode, diffCode, pyqCode, serialStr] = parts;

    const subjectName   = SUBJECT_CODE_TO_NAME[subjectCode]  || subjectCode;
    const topicName     = TOPIC_CODES[subjectCode]?.[topicCode] || topicCode;
    const sourceName    = SOURCE_CODE_TO_NAME[sourceCode]    || sourceCode;
    const typeName      = QUESTION_TYPE_CODE_TO_NAME[typeCode] || typeCode;
    const diffName      = DIFFICULTY_CODE_TO_NAME[diffCode]  || diffCode;
    const pyqName       = PYQ_CODE_TO_NAME[pyqCode]          || pyqCode;
    const serial        = parseInt(serialStr, 10);

    return {
        questionId,
        subjectCode,   subjectName,
        topicCode,     topicName,
        sourceCode,    sourceName,
        typeCode,      typeName,
        difficultyCode: diffCode, difficultyName: diffName,
        pyqCode,       pyqName,
        serial,
    };
}

// ─── Subject / Topic resolution ───────────────────────────────────────────────

/**
 * Given a subject name string (e.g. "Indian Polity"), return its 2-char code.
 * Tolerates partial / case-insensitive matches.
 */
export function resolveSubjectCode(subjectName) {
    if (!subjectName) return 'TR'; // default: Trivial

    // Exact match first
    if (SUBJECT_CODES[subjectName]) return SUBJECT_CODES[subjectName];

    // Case-insensitive partial match
    const lower = subjectName.toLowerCase();
    const found = Object.entries(SUBJECT_CODES).find(([name]) =>
        name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())
    );
    return found ? found[1] : 'TR';
}

/**
 * Given a subject code and a topic string, find the best matching topic code.
 * Falls back to '01' if no match found.
 */
export function resolveTopicCode(subjectCode, topicString) {
    const topics = TOPIC_CODES[subjectCode];
    if (!topics) return '01';

    const lower = (topicString || '').toLowerCase();
    const found = Object.entries(topics).find(([, name]) =>
        name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())
    );
    return found ? found[0] : '01';
}

// ─── AI difficulty mapping ────────────────────────────────────────────────────

/**
 * Convert an AI-generated difficulty label ("Hard", "Intermediate", "Easy")
 * to a tag difficulty code ("TO", "ME", "ES").
 */
export function aiDifficultyToCode(aiDifficulty) {
    return AI_DIFFICULTY_TO_CODE[aiDifficulty] || 'ME';
}

// ─── Full Tag Object Builder ──────────────────────────────────────────────────

/**
 * Build a complete structured tag object from raw values.
 * All inputs can be names or codes — the function resolves both.
 *
 * @param {object} params
 * @param {string} params.subject        e.g. "Indian Polity"
 * @param {string} params.topic          e.g. "Core Rights (FR, DPSP, FD)"
 * @param {string} params.source         e.g. "Standard" or "SN"
 * @param {string} params.questionType   e.g. "Factual" or "FA"
 * @param {string} params.difficulty     e.g. "Medium" or "ME" or "Hard" (AI label)
 * @param {string} params.pyq            e.g. "Not Applicable" or "NA"
 * @param {number} params.serial         e.g. 5
 * @returns {{ questionId: string, decoded: object, tagArray: Array }}
 */
export function buildFullTag({
    subject = 'Trivial',
    topic = '',
    source = 'Not Applicable',
    questionType = 'Factual',
    difficulty = 'Medium',
    pyq = 'Not Applicable',
    serial = 0,
}) {
    // Resolve codes
    const subjectCode = SUBJECT_CODES[subject] || resolveSubjectCode(subject) || 'TR';
    const topicCode   = resolveTopicCode(subjectCode, topic);
    const sourceCode  = SOURCE_CODES[source]         || AI_DIFFICULTY_TO_CODE[source]  || 'NA';
    const typeCode    = QUESTION_TYPE_CODES[questionType] || 'FA';
    // Accept both tag difficulty names ("Medium") and AI labels ("Hard")
    const diffCode    = DIFFICULTY_CODES[difficulty] || aiDifficultyToCode(difficulty) || 'ME';
    const pyqCode     = PYQ_CODES[pyq]              || 'NA';

    const questionId = generateQuestionId(subjectCode, topicCode, sourceCode, typeCode, diffCode, pyqCode, serial);
    const decoded    = decodeQuestionId(questionId);

    // Legacy tag array (compatible with existing question format)
    const tagArray = [
        { type: 'subject',    label: decoded.subjectName },
        { type: 'topic',      label: decoded.topicName },
        { type: 'source',     label: decoded.sourceName },
        { type: 'qtype',      label: decoded.typeName },
        { type: 'difficulty', label: decoded.difficultyName },
        { type: 'pyq',        label: decoded.pyqName },
    ];

    return { questionId, decoded, tagArray };
}

// ─── Approach Brief (points 1-3 derived purely from tag) ─────────────────────

/**
 * Generate the first 3 lines of the Approach Brief from a decoded tag.
 * These require NO AI — they are deterministic from the tag codes.
 *
 * @param {object} decoded  result of decodeQuestionId()
 * @returns {object}        { typeStatement, sourceStatement, difficultyAdvice }
 */
export function generateTagDerivedBrief(decoded) {
    if (!decoded) return null;

    const DIFFICULTY_ADVICE = {
        ET: 'This question is Extreme Tough — it should generally be avoided unless well-prepared.',
        TO: 'This question is Tough — attempt only if confident; be cautious of overthinking.',
        ME: 'This question is Medium difficulty — it should be attempted by a well-prepared student.',
        ES: 'This question is Easy — it must be attempted; skipping it would be a mistake.',
        FO: 'This question is Foundational — it must be attempted; it tests basic concepts.',
    };

    return {
        typeStatement:    `This is a ${decoded.typeName} type question.`,
        sourceStatement:  `It is from a ${decoded.sourceName} source.`,
        difficultyAdvice: DIFFICULTY_ADVICE[decoded.difficultyCode] || 'Assess difficulty before attempting.',
    };
}

// ─── Source suggestion from subject ──────────────────────────────────────────

/**
 * Get recommended further-reading sources for a subject.
 * Used in the AI Approach Brief's furtherReading field.
 *
 * @param {string} subjectName
 * @returns {{ core: string[], standard: string[], advanced: string[] }}
 */
export function getSubjectSources(subjectName) {
    return SUBJECT_SOURCE_MAP[subjectName] || { core: [], standard: [], advanced: [] };
}

// ─── Serial number helpers ────────────────────────────────────────────────────

/**
 * Generate a temporary serial number based on current timestamp (for AI-generated questions
 * before Firestore counter is resolved). The Firestore function will assign the real serial.
 */
export function tempSerial() {
    return parseInt(Date.now().toString().slice(-4), 10) || 1;
}
