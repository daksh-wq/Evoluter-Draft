/**
 * pyqService.js
 * Dynamically loads all PYQ JSON files from the PYQSquestions directory.
 * Uses Vite's import.meta.glob to bundle all JSON files at build time.
 */

// Eagerly import all JSON files in PYQSquestions/
const rawModules = import.meta.glob('/PYQSquestions/*.json', { eager: true });

/**
 * Derive the source/exam name from a filename.
 * e.g. "NDA_2024_1.json" → { exam: "NDA", year: 2024 }
 *      "Capf 2023 pyq.json" → { exam: "CAPF", year: 2023 }
 *      "CISF_25.json" → { exam: "CISF", year: 2025 }
 */
function parseFilename(path) {
    const filename = path.split('/').pop().replace('.json', '').replace('.json', ''); // handle double .json
    const upper = filename.toUpperCase();
    let exam = 'UPSC CSE';
    let yearFromFile = null;

    if (upper.includes('NDA')) exam = 'NDA';
    else if (upper.includes('CDSE') || upper.includes('CDS')) exam = 'CDSE';
    else if (upper.includes('CAPF')) exam = 'CAPF';
    else if (upper.includes('CISF')) exam = 'CISF';

    // Extract 4-digit year
    const yearMatch = filename.match(/20\d{2}/);
    if (yearMatch) yearFromFile = parseInt(yearMatch[0]);
    else {
        // Handle short year like "25" → 2025
        const shortYear = filename.match(/_(\d{2})(?:\.|$)/);
        if (shortYear) yearFromFile = 2000 + parseInt(shortYear[1]);
    }

    return { exam, year: yearFromFile };
}

/**
 * ALL_PYQ_QUESTIONS — flat array of all questions from all JSON files,
 * with a normalized `source` field added to each question.
 */
export const ALL_PYQ_QUESTIONS = (() => {
    const all = [];
    for (const [path, mod] of Object.entries(rawModules)) {
        const { exam } = parseFilename(path);
        const questions = Array.isArray(mod.default) ? mod.default : [];
        for (const q of questions) {
            // Attach a normalized source field derived from the pyq tag label
            const pyqTag = q.tags?.find(t => t.type === 'pyq');
            const sourceLabel = pyqTag?.label ?? '';
            const isCSE = !['NDA', 'CDSE', 'CDS', 'CAPF', 'CISF'].some(e =>
                sourceLabel.toUpperCase().includes(e)
            );
            all.push({
                ...q,
                _source: exam,   // 'NDA' | 'CDSE' | 'CAPF' | 'CISF' | 'UPSC CSE'
                _isCSE: isCSE,
            });
        }
    }
    return all;
})();

/**
 * Get all unique subjects present in the database.
 */
export const getPYQSubjects = () => {
    const subjects = new Set();
    for (const q of ALL_PYQ_QUESTIONS) {
        if (q.subject) subjects.add(q.subject);
    }
    return [...subjects].sort();
};

/**
 * Get all unique topics for a given set of subjects.
 * @param {string[]} subjects - Array of subject names. Empty = all.
 */
export const getPYQTopics = (subjects = []) => {
    const topics = new Set();
    for (const q of ALL_PYQ_QUESTIONS) {
        if (subjects.length === 0 || subjects.includes(q.subject)) {
            if (q.topic) topics.add(q.topic);
        }
    }
    return [...topics].sort();
};
