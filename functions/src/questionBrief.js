/**
 * Approach Brief Generator — Cloud Function (Phase 5)
 *
 * Generates the 9-point "Approach Brief" per question:
 * - Points 1-3: Derived directly from tag (no AI needed)
 * - Points 4-9: AI-generated via Gemini (topicContext, howToSolve, relatedQuestions, furtherReading)
 *
 * Writes result to question_bank/{questionId}.approachBrief
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(functions.config().gemini?.api_key || process.env.GEMINI_API_KEY || '');

// ─── Tag lookup maps (mirrors appConstants.js) ────────────────────────────────
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
    'Indian Polity': { core: ['NCERT Class 11 — Indian Constitution at Work'], standard: ['Indian Polity by M. Laxmikanth'], advanced: ['Constitution of India by D.D. Basu', 'Constitution Bare Act'] },
    'Ancient and Medieval History': { core: ['NCERT Class XII — Themes in Indian History Part I & II'], standard: ['Old NCERT — Ancient India by R.S. Sharma', 'Medieval India by Satish Chandra'], advanced: [] },
    'Modern India': { core: ['Modern India by Bipin Chandra (Old NCERT)'], standard: ['Spectrum — History of Modern India'], advanced: ["India's Struggle for Independence by Bipin Chandra"] },
    'Indian Culture': { core: ['NCERT Class XI — An Introduction to Indian Art'], standard: ['Indian Art and Culture by Nitin Singhania'], advanced: ['CCRT material'] },
    'Geography': { core: ['NCERT Class 11 — Fundamental of Physical Geography'], standard: ['Certificate in Physical and Human Geography by G.C. Leong'], advanced: ['Geography by Majid Hussain'] },
    'Economy of India': { core: ['NCERT Class X, XI (Indian Economic Development)', 'NCERT Class XII (Introductory Macroeconomics)'], standard: ['Indian Economy by Ramesh Singh', 'Indian Economy by Sanjeev Verma'], advanced: ['Economic Survey', 'Union Budget Document'] },
    'Environment': { core: ['NCERT Class XII Biology — Ch 13 to 16'], standard: ['PMF IAS Environment Material'], advanced: ['Ministry of Environment Reports', 'Down to Earth'] },
    'Science and Technology': { core: ['NCERT Class VI–X'], standard: ['TMH Science and Technology Book'], advanced: ['Newspapers & Current Science Publications'] },
};

const DIFFICULTY_ADVICE = {
    ET: 'This question is Extreme Tough — it should generally be avoided unless you are thoroughly prepared on this sub-topic.',
    TO: 'This question is Tough — attempt only if you are confident; do not overthink or spend more than the allowed time.',
    ME: 'This question is Medium difficulty — it should be attempted by any well-prepared candidate.',
    ES: 'This question is Easy — it must be attempted; skipping it would be a costly mistake.',
    FO: 'This question is Foundational — it must always be attempted; it tests basic conceptual clarity.',
};

// ─── Helper: decode question ID ───────────────────────────────────────────────
function decodeId(questionId) {
    if (!questionId) return null;
    const parts = questionId.split('-');
    if (parts.length !== 7) return null;
    const [sub, topic, src, type, diff, pyq] = parts;
    return {
        subjectName:    SUBJECT_CODE_TO_NAME[sub]   || sub,
        topicName:      TOPIC_CODES[sub]?.[topic]   || topic,
        sourceName:     SOURCE_CODE_TO_NAME[src]    || src,
        typeName:       TYPE_CODE_TO_NAME[type]     || type,
        difficultyName: DIFF_CODE_TO_NAME[diff]     || diff,
        difficultyCode: diff,
        pyqName:        PYQ_CODE_TO_NAME[pyq]       || pyq,
        subjectCode:    sub,
    };
}

// ─── Cloud Function ───────────────────────────────────────────────────────────
exports.generateApproachBrief = functions.https.onCall(async (data, context) => {
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

    // Points 1–3: Deterministic from tag — no AI needed
    const typeStatement    = `This is a ${decoded.typeName} type question.`;
    const sourceStatement  = `It is from a ${decoded.sourceName} source.`;
    const difficultyAdvice = DIFFICULTY_ADVICE[decoded.difficultyCode] || 'Assess difficulty before attempting.';

    // Points 4–9: AI-generated
    const sources = SUBJECT_SOURCE_MAP[decoded.subjectName] || { core: [], standard: [], advanced: [] };
    const furtherReadingSuggestions = [...sources.core, ...sources.standard].slice(0, 3);

    const prompt = `You are an expert UPSC educator. Analyze this question and provide a structured teaching brief.

QUESTION: "${questionText}"
SUBJECT: ${decoded.subjectName}
TOPIC: ${decoded.topicName}
QUESTION TYPE: ${decoded.typeName}
SOURCE LEVEL: ${decoded.sourceName}
DIFFICULTY: ${decoded.difficultyName}

Provide the following in JSON format:
{
  "howToSolve": "Specific strategy to solve this question — mention elimination, logical deduction, keyword recognition, etc. (1-2 sentences)",
  "topicContext": "~50 word factual summary on the topic of this question — include key concept, standard fact, and a current relevance if any. Must be accurate.",
  "relatedQuestions": ["3-5 probable questions that can emerge from the same topic/keywords in this question"],
  "furtherReading": ${JSON.stringify(furtherReadingSuggestions.length > 0 ? furtherReadingSuggestions : ["Refer to standard UPSC preparation books for this subject"])}
}

Return ONLY valid JSON. NO markdown. NO extra text.`;

    let aiPart = {
        howToSolve: 'Use elimination by ruling out factually incorrect options.',
        topicContext: '',
        relatedQuestions: [],
        furtherReading: furtherReadingSuggestions,
    };

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });
        const responseText = result.response.text();
        try {
            aiPart = { ...aiPart, ...JSON.parse(responseText) };
        } catch {
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) aiPart = { ...aiPart, ...JSON.parse(match[0]) };
        }
    } catch (aiErr) {
        console.error('Gemini brief generation failed:', aiErr);
        // Proceed with defaults — do not throw
    }

    const approachBrief = {
        typeStatement,
        sourceStatement,
        difficultyAdvice,
        howToSolve:       aiPart.howToSolve,
        topicContext:     aiPart.topicContext,
        relatedQuestions: aiPart.relatedQuestions || [],
        furtherReading:   aiPart.furtherReading   || furtherReadingSuggestions,
        generatedAt:      new Date().toISOString(),
    };

    // Write back to question_bank document
    try {
        await admin.firestore()
            .collection('question_bank')
            .doc(questionId)
            .set({ approachBrief, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (writeErr) {
        console.error('Failed to write approachBrief to Firestore:', writeErr);
        // Still return to client — write failure is non-fatal
    }

    return { approachBrief };
});
