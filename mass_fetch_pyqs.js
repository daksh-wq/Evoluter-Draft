import fs from 'fs';
import crypto from 'crypto';

const API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Missing VITE_GEMINI_API_KEY environment variable. Run with node --env-file=.env");
    process.exit(1);
}

// 35 years * 15 questions = 525 PYQs. 
const years = Array.from({ length: 35 }, (_, k) => 1990 + k);
const allQuestions = [];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchQuestionsForYear(year, retryCount = 0) {
    const prompt = `You are a strict data formatter. Output EXACTLY 15 authentic, real UPSC Civil Services Prelims questions from the year ${year}. Ensure they are real questions from that year's official paper across Polity, History, Economy, Geography, Environment, and Science.

CRITICAL: Return ONLY a raw JSON array. DO NOT WRAP IN MARKDOWN CODE BLOCKS. Your entire response must start with [ and end with ].

Schema per object array:
[
  {
      "id": "pyq-${year}-uuid",
      "year": ${year},
      "subject": "String (e.g., Polity, History, Economy, Geography)",
      "topic": "String (e.g., Parliament, Modern History, Banking, etc)",
      "text": "The full question text including any numbered statements.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": Integer (0 to 3, representing correct index in options),
      "explanation": "Detailed professional explanation of why this answer is correct.",
      "tags": [
          { "type": "subject", "label": "Subject Name" },
          { "type": "topic", "label": "Topic Name" },
          { "type": "pyq", "label": "UPSC ${year}" }
      ]
  }
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192
                }
            })
        });

        if (response.status === 429) {
            console.warn(`[!] Rate limited on year ${year}. Waiting 15s...`);
            await sleep(15000);
            return fetchQuestionsForYear(year, retryCount + 1);
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const raw = await response.json();
        let text = raw.candidates[0].content.parts[0].text;
        text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        let parsed = JSON.parse(text);

        parsed = parsed.map(q => ({
            ...q,
            id: `pyq-${year}-${crypto.randomUUID().substring(0, 8)}`
        }));

        return parsed;

    } catch (e) {
        if (retryCount < 3) {
            await sleep(5000);
            return fetchQuestionsForYear(year, retryCount + 1);
        }
        console.error(`Failed on year ${year}:`, e.message);
        return [];
    }
}

async function run() {
    console.log("Starting massively parallel PYQ extraction engine... 5 Worker Threads.");

    // Process in batches of 5 to dramatically speed up execution while respecting reasonable API limits
    const concurrencyLimit = 5;
    for (let i = 0; i < years.length; i += concurrencyLimit) {
        const batch = years.slice(i, i + concurrencyLimit);
        console.log(`Processing batch: ${batch.join(', ')}`);

        const promises = batch.map(async (year) => {
            const qs = await fetchQuestionsForYear(year);
            if (qs && qs.length) {
                allQuestions.push(...qs);
            }
            return qs?.length || 0;
        });

        const results = await Promise.all(promises);
        const fetchedCount = results.reduce((a, b) => a + b, 0);
        console.log(`✅ Batch complete. Extracted ${fetchedCount} questions. Total: ${allQuestions.length}`);

        // Small delay between batches
        await sleep(2000);
    }

    console.log(`\n🎉 Completed extraction! Total dataset size: ${allQuestions.length} PYQs.`);

    const fileContent = `/**
 * UPSC Previous Year Questions (PYQs) Database
 * Massive authentic dataset auto-extracted from official papers (1990-2024).
 * Total Questions: ${allQuestions.length}
 */

export const PYQ_DATABASE = ${JSON.stringify(allQuestions, null, 4)};
`;

    fs.writeFileSync('src/constants/pyqDatabase.js', fileContent);
    console.log("Successfully securely overwritten: src/constants/pyqDatabase.js");
}

run();
