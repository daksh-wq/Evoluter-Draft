/**
 * Approach Brief Generator — Cloud Function
 *
 * Generates the 9-point "Approach Brief" per question:
 * - Points 1-3: Derived directly from tag (no AI needed)
 * - Points 4-9: AI-generated via Gemini
 *
 * Production hardening:
 * - runWith() for memory/timeout
 * - Rate limiting added (HIGH-7 fix)
 * - Input sanitization for AI prompts
 * - Shared AI client
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { checkAndIncrementRateLimit } = require('./rateLimit');
const { generateJSON } = require('./utils/geminiClient');
const { parseAIJsonResponse, sanitizeForPrompt } = require('./utils/promptHelpers');

// ─── Tag lookup maps ──────────────────────────────────────────────────────────
const SUBJECT_CODE_TO_NAME = {
    IP: 'Indian Polity', AM: 'Ancient and Medieval History', MI: 'Modern India',
    IC: 'Indian Culture', GE: 'Geography', EI: 'Economy of India',
    EN: 'Environment', ST: 'Science and Technology', CA: 'Current Affairs', TR: 'Trivial',
};
const TOPIC_CODES = {
    IP: { '01': 'Constitutional Fundamentals', '02': 'Core Rights (FR, DPSP, FD)', '03': 'Union Executive', '04': 'Union Legislature (Parliament)', '05': 'Judiciary & Judicial Review', '06': 'Federal Structure & Centre-State', '07': 'State & Local Governance', '08': 'Constitutional Bodies', '09': 'Governance & Rights' },
    AM: { '01': 'Indus Valley & Vedic Period', '02': 'Mahajanapadas & Magadhan Ascendancy', '03': 'Heterodox Sects (Buddhism & Jainism)', '04': 'Mauryan & Post-Mauryan Period', '05': 'Gupta & Post-Gupta Period', '06': 'Delhi Sultanate', '07': 'Mughal Empire' },
    MI: { '01': 'Colonial Expansion', '02': 'Administrative & Social Changes', '03': 'Early Resistance', '04': 'Rise of Nationalism', '05': 'Extremist & Revolutionary Phase', '06': 'The Gandhian Era', '07': 'Constitutional Developments', '08': 'Towards Independence & Partition' },
    IC: { '01': 'Ancient Architecture & Sculpture', '02': 'Rock-Cut & Cave Architecture', '03': 'Temple Architecture', '04': 'Indo-Islamic Architecture', '05': 'Classical Performing Arts', '06': 'Folk Arts & Crafts', '07': 'Philosophy & Literature', '08': 'Bhakti and Sufi Movements' },
    GE: { '01': 'Geomorphology & Lithosphere', '02': 'Climatology & Atmosphere', '03': 'Oceanography & Hydrosphere', '04': 'Indian Physiography', '05': 'Indian Climate & Monsoon', '06': 'Indian Resources & Agriculture', '07': 'Human & Economic Geography' },
    EI: { '01': 'Basic Concepts & National Income', '02': 'Inflation & Monetary Policy', '03': 'Public Finance & Taxation', '04': 'Banking & Financial Markets', '05': 'External Sector', '06': 'Sectoral Issues & Reforms', '07': 'Poverty, Unemployment & Schemes' },
    EN: { '01': 'Basic Ecology', '02': 'Biodiversity', '03': 'Conservation Initiatives', '04': 'Pollution & Waste Management', '05': 'Climate Change', '06': 'International Treaties', '07': 'Institutions & Governance' },
    ST: { '01': 'Space Technology', '02': 'Biotechnology & Health', '03': 'IT & Digital Tech', '04': 'Defence & Nuclear', '05': 'Basic Science' },
    CA: { '01': 'Governance & Bills/Acts', '02': 'International Relations', '03': 'Economic & Social Reports', '04': 'Environment & S&T Updates', '05': 'Culture & Miscellaneous' },
    TR: { '01': 'General Trivia' },
};
const SOURCE_CODE_TO_NAME = { SN: 'Standard', AD: 'Advanced', RN: 'Random', CI: 'Current Issue', NA: 'Not Applicable' };
const TYPE_CODE_TO_NAME   = { FA: 'Factual', CO: 'Conceptual', AB: 'Application Based', DE: 'Definition', IN: 'Informative' };
const DIFF_CODE_TO_NAME   = { ET: 'Extreme Tough', TO: 'Tough', ME: 'Medium', ES: 'Easy', FO: 'Foundational' };
const PYQ_CODE_TO_NAME    = { CS: 'CSE', CD: 'CDSE', ND: 'NDA', CI: 'CISF', CP: 'CAPF', NA: 'Not Applicable' };

const SUBJECT_SOURCE_MAP = {
    'Indian Polity': { core: ['NCERT Class 11 — Indian Constitution at Work'], standard: ['Indian Polity by M. Laxmikanth'], advanced: ['Constitution of India by D.D. Basu'] },
    'Ancient and Medieval History': { core: ['NCERT Class XII — Themes in Indian History Part I & II'], standard: ['Old NCERT — Ancient India by R.S. Sharma'], advanced: [] },
    'Modern India': { core: ['Modern India by Bipin Chandra (Old NCERT)'], standard: ['Spectrum — History of Modern India'], advanced: [] },
    'Indian Culture': { core: ['NCERT Class XI — An Introduction to Indian Art'], standard: ['Indian Art and Culture by Nitin Singhania'], advanced: [] },
    'Geography': { core: ['NCERT Class 11 — Fundamental of Physical Geography'], standard: ['Certificate in Physical and Human Geography by G.C. Leong'], advanced: [] },
    'Economy of India': { core: ['NCERT Class X, XI (Indian Economic Development)'], standard: ['Indian Economy by Ramesh Singh'], advanced: ['Economic Survey'] },
    'Environment': { core: ['NCERT Class XII Biology — Ch 13 to 16'], standard: ['PMF IAS Environment Material'], advanced: [] },
    'Science and Technology': { core: ['NCERT Class VI–X'], standard: ['TMH Science and Technology Book'], advanced: [] },
};

const DIFFICULTY_ADVICE = {
    ET: 'This question is Extreme Tough — avoid unless thoroughly prepared.',
    TO: 'This question is Tough — attempt only if confident.',
    ME: 'This question is Medium difficulty — should be attempted by well-prepared candidates.',
    ES: 'This question is Easy — must be attempted.',
    FO: 'This question is Foundational — always attempt.',
};

function decodeId(questionId) {
    if (!questionId) return null;
    const parts = questionId.split('-');
    if (parts.length !== 7) return null;
    const [sub, topic, src, type, diff, pyq] = parts;
    return {
        subjectName: SUBJECT_CODE_TO_NAME[sub] || sub,
        topicName: TOPIC_CODES[sub]?.[topic] || topic,
        sourceName: SOURCE_CODE_TO_NAME[src] || src,
        typeName: TYPE_CODE_TO_NAME[type] || type,
        difficultyName: DIFF_CODE_TO_NAME[diff] || diff,
        difficultyCode: diff,
        pyqName: PYQ_CODE_TO_NAME[pyq] || pyq,
        subjectCode: sub,
    };
}

// ─── Cloud Function ───────────────────────────────────────────────────────────
exports.generateApproachBrief = functions
    .runWith({ memory: '256MB', timeoutSeconds: 60 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { questionId, questionText } = data;
        if (!questionId || !questionText) {
            throw new functions.https.HttpsError('invalid-argument', 'questionId and questionText are required');
        }

        const decoded = decodeId(questionId);
        if (!decoded) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid questionId format');
        }

        // Rate limit — prevents AI cost abuse (HIGH-7 fix)
        await checkAndIncrementRateLimit(context.auth.uid, 'question_generation');

        // Sanitize question text for AI prompt
        const safeText = sanitizeForPrompt(questionText, 1000);

        // Points 1–3: Deterministic from tag
        const typeStatement = `This is a ${decoded.typeName} type question.`;
        const sourceStatement = `It is from a ${decoded.sourceName} source.`;
        const difficultyAdvice = DIFFICULTY_ADVICE[decoded.difficultyCode] || 'Assess difficulty before attempting.';

        // Points 4–9: AI-generated
        const sources = SUBJECT_SOURCE_MAP[decoded.subjectName] || { core: [], standard: [], advanced: [] };
        const furtherReadingSuggestions = [...sources.core, ...sources.standard].slice(0, 3);

        const prompt = `You are an expert UPSC educator. Analyze this question and provide a structured teaching brief.

QUESTION: "${safeText}"
SUBJECT: ${decoded.subjectName}
TOPIC: ${decoded.topicName}
QUESTION TYPE: ${decoded.typeName}
SOURCE LEVEL: ${decoded.sourceName}
DIFFICULTY: ${decoded.difficultyName}

Provide the following in JSON format:
{
  "howToSolve": "Specific strategy to solve this question (1-2 sentences)",
  "topicContext": "~50 word factual summary on the topic",
  "relatedQuestions": ["3-5 probable questions from the same topic"],
  "furtherReading": ${JSON.stringify(furtherReadingSuggestions.length > 0 ? furtherReadingSuggestions : ['Refer to standard UPSC preparation books'])}
}

Return ONLY valid JSON. NO markdown. NO extra text.`;

        let aiPart = {
            howToSolve: 'Use elimination by ruling out factually incorrect options.',
            topicContext: '',
            relatedQuestions: [],
            furtherReading: furtherReadingSuggestions,
        };

        try {
            const responseText = await generateJSON(prompt);
            const parsed = parseAIJsonResponse(responseText, 'object');
            aiPart = { ...aiPart, ...parsed };
        } catch (aiErr) {
            console.error('Gemini brief generation failed:', aiErr.message);
        }

        const approachBrief = {
            typeStatement,
            sourceStatement,
            difficultyAdvice,
            howToSolve: aiPart.howToSolve,
            topicContext: aiPart.topicContext,
            relatedQuestions: aiPart.relatedQuestions || [],
            furtherReading: aiPart.furtherReading || furtherReadingSuggestions,
            generatedAt: new Date().toISOString(),
        };

        // Write back to question_bank
        try {
            await admin.firestore()
                .collection('question_bank')
                .doc(questionId)
                .set({ approachBrief, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        } catch (writeErr) {
            console.error('Failed to write approachBrief:', writeErr.message);
        }

        return { approachBrief };
    });
