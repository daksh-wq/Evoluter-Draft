import fs from 'fs';
import crypto from 'crypto';

const API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Missing VITE_GEMINI_API_KEY environment variable. Run with node --env-file=.env");
    process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const TARGETS = [
    { subject: 'Economy', years: '2020 to 2024' },
    { subject: 'Science', years: '2020 to 2024' },
    { subject: 'Environment', years: '2020 to 2024' },
    { subject: 'Polity', years: '2015 to 2024' },
    { subject: 'History', years: '2015 to 2024' },
    { subject: 'Art and Culture', years: '2015 to 2024' },
    { subject: 'Geography', years: '2015 to 2024' }
];

async function fetchTargetedPYQs(subject, yearRange, retryCount = 0) {
    const prompt = `You are building a precise UPSC CSE Prelims database. Provide exactly 10 authentic, official UPSC Civil Services Prelims questions for the subject "${subject}" specifically from the years ${yearRange}. 

CRITICAL INSTRUCTIONS:
1. ONLY return real questions that appeared in the actual UPSC CSE Prelims exams during ${yearRange}.
2. If 10 exact questions are not available for this exact subject in this time frame, provide as many real ones as possible, then intelligently generate highly realistic, UPSC-standard proxy questions to reach exactly 10.
3. Your output MUST be ONLY a raw JSON array. DO NOT WRAP IN MARKDOWN. NO \`\`\`json blocks.
4. Distribute the "year" field properly across the requested range (${yearRange}).

Schema per object:
[
  {
      "id": "pyq-uuid",
      "year": Integer (A year within ${yearRange}),
      "subject": "${subject === 'Art and Culture' ? 'History' : subject}",
      "topic": "${subject === 'Art and Culture' ? 'Art and Culture' : 'General'}",
      "text": "The full question text including any numbered statements.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": Integer (0 to 3, representing correct index in options),
      "explanation": "Extremely brief 1-sentence explanation.",
      "tags": [
          { "type": "subject", "label": "${subject === 'Art and Culture' ? 'History' : subject}" },
          { "type": "topic", "label": "${subject === 'Art and Culture' ? 'Art and Culture' : 'General'}" }
      ]
  }
]`;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + API_KEY;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2, // Low temp for mostly factual recall
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192
                }
            }),
            signal: AbortSignal.timeout(60000)
        });

        if (response.status === 429) {
            console.warn(`[!] Rate limited on ${subject}. Waiting 15s...`);
            await sleep(15000);
            return fetchTargetedPYQs(subject, yearRange, retryCount + 1);
        }

        if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

        const raw = await response.json();
        let text = raw.candidates[0].content.parts[0].text;
        text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        let parsed = JSON.parse(text);

        const safeSubject = subject === 'Art and Culture' ? 'History' : subject;
        parsed = parsed.map(q => ({
            ...q,
            id: `pyq-${safeSubject.toLowerCase().substring(0, 4)}-${crypto.randomUUID().substring(0, 8)}`
        }));

        return parsed;

    } catch (e) {
        if (retryCount < 3) {
            console.warn(`[!] Timeout/Error on ${subject} (Attempt ${retryCount + 1}): ${e.message}. Retrying in 5s...`);
            await sleep(5000);
            return fetchTargetedPYQs(subject, yearRange, retryCount + 1);
        }
        console.error(`Failed permanently on subject ${subject}:`, e.message);
        return [];
    }
}

async function run() {
    let allQuestions = [];
    const dbPath = 'src/constants/pyqDatabase.js';
    
    // 1. Load existing database
    try {
        const pyqFile = fs.readFileSync(dbPath, 'utf8');
        const match = pyqFile.match(/export const PYQ_DATABASE = (\[[\s\S]*\]);/);
        if (match) {
            allQuestions = JSON.parse(match[1]);
            console.log(`Loaded ${allQuestions.length} existing questions from database.`);
        }
    } catch (e) {
        console.error("Failed to load existing database:", e.message);
        process.exit(1);
    }

    // 2. Fetch Targeted Missing Questions
    console.log(`\nStarting Targeted PYQ Fetcher to fill in missing gaps for model training...\n`);

    for (const target of TARGETS) {
        process.stdout.write(`Fetching ~40 missing questions for ${target.subject} (${target.years})...\n`);
        
        const newQs = await fetchTargetedPYQs(target.subject, target.years);
        if (newQs.length > 0) {
            allQuestions.push(...newQs);
            console.log(`✅ Extracted ${newQs.length} new questions. Total DB Size: ${allQuestions.length}`);
            
            // Auto-save progress
            const fileContent = `/**\n * UPSC Previous Year Questions (PYQs) Database\n * Massive comprehensive dataset auto-extracted sequentially.\n * Total Questions: ${allQuestions.length}\n */\n\nexport const PYQ_DATABASE = ${JSON.stringify(allQuestions, null, 4)};\n`;
            fs.writeFileSync(dbPath, fileContent);
        } else {
            console.log(`❌ Failed to extract questions for ${target.subject}.`);
        }
        await sleep(4000); // Prevent rate limiting between subjects
    }

    console.log(`\n🎉 Targeted extraction complete! The database now has ${allQuestions.length} questions.`);
}

run();
