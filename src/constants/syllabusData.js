/**
 * Detailed UPSC Syllabus Data
 * Used to feed specific context to the AI for high-quality question generation.
 */

export const UPSC_SYLLABUS = {
    // --- GS Paper 2: Indian Polity & Governance ---
    "Polity": {
        name: "Indian Polity & Constitution",
        keywords: [
            "Constitution of India", "Parliament", "Fundamental Rights", "Supreme Court",
            "Federalism", "Governor", "Panchayati Raj", "Election Commission"
        ],
        subtopics: [
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
    // --- GS Paper 1: History ---
    "History": {
        name: "Indian History & Culture",
        keywords: ["Ancient", "Medieval", "Modern", "Art and Culture", "Freedom Struggle"],
        subtopics: [
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
    // --- GS Paper 1: Geography ---
    "Geography": {
        name: "Indian & World Geography",
        keywords: ["Physical Geography", "Climate", "Resources", "Agriculture", "Maps"],
        subtopics: [
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
    // --- GS Paper 3: Economy ---
    "Economy": {
        name: "Indian Economy",
        keywords: ["GDP", "Inflation", "Banking", "Budget", "Agriculture", "Planning"],
        subtopics: [
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
    // --- GS Paper 3: Environment ---
    "Environment": {
        name: "Environment & Ecology",
        keywords: ["Biodiversity", "Climate Change", "Pollution", "Conservation", "Acts"],
        subtopics: [
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
    // --- GS Paper 3: Science & Tech ---
    "Science": {
        name: "Science & Technology",
        keywords: ["Space", "Defence", "Biotech", "NanoTech", "IT"],
        subtopics: [
            "Space Technology: ISRO Missions (Chandrayaan, Gaganyaan), Orbits",
            "Defence Technology: Missiles, Aircrafts, Submarines",
            "Biotechnology: CRISPR, GM Crops, DNA Technology",
            "Nanotechnology & Robotics",
            "Information Technology: AI, Blockchain, 5G, Cyber Security",
            "Public Health: Diseases, Vaccines, Immunity",
            "Intellectual Property Rights (IPR)"
        ]
    }
};

/**
 * Helper to get a random subtopic for a given subject to diversify questions.
 */
export const getRandomSubtopic = (subjectKey) => {
    // Normalize key (e.g. "polity" -> "Polity")
    const key = Object.keys(UPSC_SYLLABUS).find(k => k.toLowerCase() === subjectKey.toLowerCase());
    const subject = UPSC_SYLLABUS[key];
    if (!subject) return null;

    const randomIndex = Math.floor(Math.random() * subject.subtopics.length);
    return {
        subject: subject.name,
        subtopic: subject.subtopics[randomIndex],
        keywords: subject.keywords
    };
};
