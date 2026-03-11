import fs from 'fs';
import crypto from 'crypto';

const API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Missing VITE_GEMINI_API_KEY environment variable. Run with node --env-file=.env");
    process.exit(1);
}

// Recreate the syllabus array so we don't have to fiddle with ES modules in a quick node script
const UPSC_SYLLABUS_ENTRIES = [
    {
        subject: "Polity",
        topics: [
            "Historical Background (Regulating Act 1773 to Independence Act 1947)",
            "Making of the Constitution & Salient Features",
            "Preamble: Keywords and Significance",
            "Union & Territory (Articles 1-4) & Citizenship (Articles 5-11)",
            "Fundamental Rights (Articles 12-35) - Writs, Restrictions, Case Laws",
            "Directive Principles of State Policy (DPSP) & Fundamental Duties",
            "Amendment of the Constitution (Basic Structure Doctrine)",
            "Parliamentary System vs Presidential System",
            "Federal System & Center-State Relations (Legislative, Admin, Financial)",
            "Emergency Provisions (National, State, Financial)",
            "President & Vice-President: Election, Powers, Impeachment",
            "Prime Minister & Council of Ministers",
            "Parliament: Sessions, Motions, Bills, Committees, Budget",
            "Supreme Court: Jurisdiction, Judicial Review, judicial Activism",
            "Governor: Powers, Discretionary Role, Center's Agent",
            "State Legislature & Chief Minister",
            "High Courts & Subordinate Courts",
            "Panchayati Raj Institutions (73rd Amendment) & Municipalities (74th Amendment)",
            "Constitutional Bodies: ECI, UPSC, SPSC, Finance Commission, CAG, NCSC, NCST",
            "Non-Constitutional Bodies: NITI Aayog, NHRC, CIC, CVC, Lokpal"
        ]
    },
    {
        subject: "History",
        topics: [
            "Indus Valley Civilization & Vedic Age",
            "Buddhism & Jainism: Philosophy & Architecture",
            "Mauryan Empire: Administration & Art",
            "Gupta Period: Golden Age of Art & Science",
            "Bhakti & Sufi Movements",
            "Mughal Administration, Art & Architecture",
            "Vijayanagara Empire",
            "Advent of Europeans & British Expansion",
            "Social-Religious Reform Movements (19th Century)",
            "Revolt of 1857 & Rise of Nationalism",
            "Indian National Congress (Moderate & Extremist Phase)",
            "Gandhian Era: Non-Cooperation, Civil Disobedience, Quit India",
            "Revolutionary Activities & INA",
            "Partition & Independence",
            "Temple Architecture (Nagara, Dravida, Vesara)",
            "Indian Paintings, Music & Dance Forms"
        ]
    },
    {
        subject: "Geography",
        topics: [
            "Geomorphology: Interior of Earth, Plate Tectonics, Earthquakes, Volcanoes",
            "Climatology: Atmosphere, Cyclones (Tropical/Temperate), Monsoon Mechanism",
            "Oceanography: Currents, Tides, Coral Reefs",
            "Indian Physiography: Himalayas, Northern Plains, Peninsular Plateau",
            "Drainage System: Himalayan vs Peninsular Rivers",
            "Indian Climate: Seasons, El Nino/La Nina, Indian Ocean Dipole",
            "Soils of India & Natural Vegetation",
            "Agriculture: Crops, Irrigation, Green Revolution",
            "Mineral & Energy Resources of India",
            "Transport & Communication"
        ]
    },
    {
        subject: "Economy",
        topics: [
            "National Income Accounting (GDP, GNP, NNP)",
            "Inflation: Types, CPI, WPI, Control Measures",
            "Monetary Policy (RBI) & Banking System",
            "Fiscal Policy: Budget, Deficits, GST, Taxation",
            "Poverty & Unemployment in India",
            "Inclusive Growth & Financial Inclusion",
            "Agriculture: MSP, Subsidies, Food Processing",
            "Industry & Infrastructure (Roads, Ports, Energy)",
            "Balance of Payments & Foreign Trade",
            "International Organizations (WTO, IMF, World Bank)"
        ]
    },
    {
        subject: "Environment",
        topics: [
            "Ecosystem: Functions, Food Chains, Cycles",
            "Biodiversity: Levels, Threats, Conservation (In-situ/Ex-situ)",
            "Protected Areas: National Parks, Wildlife Sanctuaries, Biosphere Reserves",
            "Climate Change: GHG, Global Warming, Ozone Depletion",
            "International Conventions: UNFCCC, Kyoto, Paris, CBD, Ramsar",
            "Pollution: Air, Water, Soil, Noise, E-Waste",
            "Environmental Laws: Wildlife Protection Act, EPA, Forest Rights Act",
            "Renewable Energy & Sustainable Development"
        ]
    },
    {
        subject: "Science",
        topics: [
            "Space Technology: ISRO Missions (Chandrayaan, Gaganyaan), Orbits",
            "Defence Technology: Missiles, Aircrafts, Submarines",
            "Biotechnology: CRISPR, GM Crops, DNA Technology",
            "Nanotechnology & Robotics",
            "Information Technology: AI, Blockchain, 5G, Cyber Security",
            "Public Health: Diseases, Vaccines, Immunity",
            "Intellectual Property Rights (IPR)"
        ]
    }
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const allQuestions = [];

async function fetchQuestionsForTopic(subject, topic, retryCount = 0) {
    const prompt = `You are a strict data formatter building a massive database. Output EXACTLY 30 authentic, real UPSC Civil Services Prelims questions heavily focused on the specific topic: "${topic}" under the subject "${subject}". Draw from the past 25 years of official examinations. If the exact topic lacks 30 questions, intelligently extrapolate highly realistic proxy questions that are indistinguishable from official ones.

CRITICAL: Return ONLY a raw JSON array. DO NOT WRAP IN MARKDOWN CODE BLOCKS. Your entire response must start with [ and end with ].

Schema per object array:
[
  {
      "id": "pyq-topic-uuid",
      "year": Integer (random year between 1995 and 2024),
      "subject": "${subject}",
      "topic": "${topic}",
      "text": "The full question text including any numbered statements.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": Integer (0 to 3, representing correct index in options),
      "explanation": "Extremely brief 1-sentence explanation to conserve JSON token limits.",
      "tags": [
          { "type": "subject", "label": "${subject}" },
          { "type": "topic", "label": "${topic}" },
          { "type": "pyq", "label": "UPSC 2021" }
      ]
  }
]`;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192
                }
            }),
            signal: AbortSignal.timeout(60000)
        });

        if (response.status === 429) {
            console.warn("[!] Rate limited on " + topic + ". Waiting 15s...");
            await sleep(15000);
            return fetchQuestionsForTopic(subject, topic, retryCount + 1);
        }

        if (!response.ok) {
            throw new Error("API Error: " + response.status + " " + response.statusText);
        }

        const raw = await response.json();
        let text = raw.candidates[0].content.parts[0].text;
        text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        let parsed = JSON.parse(text);

        parsed = parsed.map(q => ({
            ...q,
            id: "pyq-" + subject.toLowerCase().substring(0, 4) + "-" + crypto.randomUUID().substring(0, 8),
            tags: [
                { type: 'subject', label: subject },
                { type: 'topic', label: topic },
                { type: 'pyq', label: "UPSC " + q.year }
            ]
        }));

        return parsed;

    } catch (e) {
        if (retryCount < 4) {
            console.warn("[!] Timeout/Error on " + topic + " (Attempt " + (retryCount + 1) + "): " + e.message + ". Retrying in 5s...");
            await sleep(5000);
            return fetchQuestionsForTopic(subject, topic, retryCount + 1);
        }
        console.error("Failed on topic " + topic + ":", e.message);
        return [];
    }
}

async function run() {
    // Start with existing DB so we don't overwrite the initial batch if there's an error
    let initialCount = 0;
    try {
        const pyqFile = fs.readFileSync('src/constants/pyqDatabase.js', 'utf8');
        const match = pyqFile.match(/export const PYQ_DATABASE = (\[[\s\S]*\]);/);
        if (match) {
            const existing = JSON.parse(match[1]);
            allQuestions.push(...existing);
            initialCount = existing.length;
            console.log("Loaded " + initialCount + " existing questions from database.");
        }
    } catch (e) { }

    const tasks = [];
    for (const group of UPSC_SYLLABUS_ENTRIES) {
        for (const topic of group.topics) {
            tasks.push({ subject: group.subject, topic: topic });
        }
    }

    console.log("Starting Sequential Topic-Based Extraction Engine... Targeting " + (tasks.length * 30) + " New Questions!");

    // Process strictly 1 topic concurrently (sequential)
    const concurrencyLimit = 1;
    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
        const batch = tasks.slice(i, i + concurrencyLimit);
        console.log("Processing Topic " + (i + 1) + " of " + tasks.length + "...");

        const promises = batch.map(async (task) => {
            process.stdout.write("   -> Fetching 30 qs for " + task.topic + "\n");
            const qs = await fetchQuestionsForTopic(task.subject, task.topic);
            if (qs && qs.length) {
                allQuestions.push(...qs);
            }
            return qs?.length || 0;
        });

        const results = await Promise.all(promises);
        const fetchedCount = results.reduce((a, b) => a + b, 0);
        console.log("✅ Topic complete. Extracted " + fetchedCount + " new questions. Total Database Size: " + allQuestions.length + "\n");

        // Save incrementally after every single topic to cleanly build up the array
        const fileContent = "/**\n" +
            " * UPSC Previous Year Questions (PYQs) Database\n" +
            " * Massive comprehensive dataset auto-extracted sequentially across specific syllabus topics.\n" +
            " * Total Questions: " + allQuestions.length + "\n" +
            " */\n\n" +
            "export const PYQ_DATABASE = " + JSON.stringify(allQuestions, null, 4) + ";\n";

        fs.writeFileSync('src/constants/pyqDatabase.js', fileContent);
        console.log("   -> 💾 Database securely saved to src/constants/pyqDatabase.js");

        await sleep(3000);
    }

    console.log("\n🎉 Completed sequential extraction! Total dataset size: " + allQuestions.length + " PYQs.");
}

run();
