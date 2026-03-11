/**
 * Mock Data Fixtures
 * Centralized location for all mock/placeholder data
 * Easy to identify and replace with real data in production
 */

/**
 * Mock News Feed Data
 * Used in: NewsView.jsx
 */
export const MOCK_NEWS_FEED = [
    {
        id: 1,
        title: "Union Budget 2024: Key Highlights",
        snippet: "Finance Minister presents budget focusing on infrastructure and digital economy...",
        category: "Economy",
        date: "2 Hours ago",
        saved: false,
    },
    {
        id: 2,
        title: "India's GDP Growth Projections Revised",
        snippet: "Latest economic survey indicates strong growth momentum in manufacturing sector...",
        category: "Economy",
        date: "5 Hours ago",
        saved: false,
    },
    {
        id: 3,
        title: "Supreme Court Ruling on Article 370",
        snippet: "Historic judgment delivered on constitutional provisions regarding special status...",
        category: "Polity",
        date: "1 Day ago",
        saved: true,
    },
    {
        id: 4,
        title: "India-China Border Talks: Latest Update",
        snippet: "Diplomatic discussions continue at LAC with focus on disengagement protocols...",
        category: "International Relations",
        date: "1 Day ago",
        saved: false,
    },
    {
        id: 5,
        title: "Climate Change: India's Net Zero Target",
        snippet: "Government announces new renewable energy initiatives to meet 2070 commitments...",
        category: "Environment",
        date: "2 Days ago",
        saved: false,
    },
];

/**
 * Mock Question Bank
 * Used in: helpers.js - generateMockQuestions()
 */
export const MOCK_QUESTIONS = [
    {
        topic: 'History',
        questions: [
            {
                text: "When did the Revolt of 1857 begin?",
                options: ["May 10, 1857", "June 10, 1857", "July 10, 1857", "August 10, 1857"],
                correctAnswer: 0,
                explanation: "The Revolt of 1857 began on May 10, 1857, when sepoys in Meerut revolted."
            },
            {
                text: "Who was the first Governor-General of independent India?",
                options: ["Lord Mountbatten", "C. Rajagopalachari", "Dr. Rajendra Prasad", "Jawaharlal Nehru"],
                correctAnswer: 0,
                explanation: "Lord Mountbatten served as the first Governor-General of independent India from August 1947 to June 1948."
            },
        ],
    },
    {
        topic: 'Economy',
        questions: [
            {
                text: "What does 'Fiscal Deficit' mean?",
                options: [
                    "Excess of total expenditure over total revenue",
                    "Excess of revenue expenditure over revenue receipts",
                    "Excess of total expenditure over total receipts excluding borrowings",
                    "Difference between exports and imports"
                ],
                correctAnswer: 2,
                explanation: "Fiscal deficit is the excess of total expenditure over total receipts excluding borrowings during a fiscal year."
            },
            {
                text: "Which organization regulates monetary policy in India?",
                options: ["SEBI", "RBI", "NITI Aayog", "Finance Ministry"],
                correctAnswer: 1,
                explanation: "The Reserve Bank of India (RBI) is responsible for formulating and implementing monetary policy in India."
            },
        ],
    },
    {
        topic: 'Polity',
        questions: [
            {
                text: "Which Article of the Constitution abolishes Untouchability?",
                options: ["Article 14", "Article 15", "Article 16", "Article 17"],
                correctAnswer: 3,
                explanation: "Article 17 of the Indian Constitution abolishes 'untouchability' and forbids its practice in any form."
            },
            {
                text: "How many fundamental rights are guaranteed by the Indian Constitution?",
                options: ["5", "6", "7", "8"],
                correctAnswer: 1,
                explanation: "The Indian Constitution originally had 7 fundamental rights, but after the 44th Amendment (1978), the Right to Property was removed, leaving 6 fundamental rights."
            },
        ],
    },
    {
        topic: 'Science',
        questions: [
            {
                text: "CRISPR technology is primarily used for:",
                options: [
                    "Weather forecasting",
                    "Gene editing",
                    "Space exploration",
                    "Earthquake prediction"
                ],
                correctAnswer: 1,
                explanation: "CRISPR (Clustered Regularly Interspaced Short Palindromic Repeats) is a revolutionary gene-editing technology."
            },
            {
                text: "What is the full form of ISRO?",
                options: [
                    "Indian Space Research Organization",
                    "International Space Research Organization",
                    "Indian Scientific Research Organization",
                    "Indian Satellite Research Organization"
                ],
                correctAnswer: 0,
                explanation: "ISRO stands for Indian Space Research Organisation, India's national space agency."
            },
        ],
    },
    {
        topic: 'Geography',
        questions: [
            {
                text: "Which Indian state has the longest coastline?",
                options: ["Tamil Nadu", "Gujarat", "Andhra Pradesh", "Maharashtra"],
                correctAnswer: 1,
                explanation: "Gujarat has the longest coastline among Indian states, stretching approximately 1,600 km."
            },
            {
                text: "The monsoon in India is primarily caused by:",
                options: [
                    "Rotation of Earth",
                    "Differential heating of land and sea",
                    "Cyclonic activities",
                    "Ocean currents"
                ],
                correctAnswer: 1,
                explanation: "Indian monsoon is primarily caused by differential heating of land and sea, creating pressure differences that drive wind patterns."
            },
        ],
    },
];

/**
 * Mock User Testimonials
 * Used in: HomeView.jsx
 */
export const MOCK_TESTIMONIALS = [
    {
        id: 1,
        name: "Priya Sharma",
        role: "UPSC CSE 2023 Qualifier",
        avatar: "PS",
        rating: 5,
        text: "The AI-powered question generation helped me identify my weak areas. The analytics dashboard is incredibly insightful!",
    },
    {
        id: 2,
        name: "Rahul Verma",
        role: "IAS Officer, 2022 Batch",
        avatar: "RV",
        rating: 5,
        text: "Evoluter's adaptive testing engine pushed me to improve consistently. The real-time progress tracking kept me motivated throughout my preparation.",
    },
    {
        id: 3,
        name: "Anjali Reddy",
        role: "Current Aspirant",
        avatar: "AR",
        rating: 4,
        text: "The personalized study plans and AI evaluations for mains answers are game-changers. Feels like having a personal mentor!",
    },
];

/**
 * Mock FAQ Data
 * Used in: HomeView.jsx
 */
export const MOCK_FAQ = [
    {
        id: 1,
        question: "Is Evoluter free to use?",
        answer: "Yes! Evoluter offers a comprehensive free tier with access to AI-generated questions, progress tracking, and basic analytics. Premium features are available through our subscription plans.",
    },
    {
        id: 2,
        question: "How does the AI question generator work?",
        answer: "Our AI uses advanced language models to generate contextually relevant questions based on your selected topics, difficulty level, and past performance. It adapts to your learning curve over time.",
    },
    {
        id: 3,
        question: "Can I track my progress over time?",
        answer: "Absolutely! The dashboard provides detailed analytics including topic-wise mastery, accuracy trends, time management insights, and personalized recommendations.",
    },
    {
        id: 4,
        question: "Is my data secure?",
        answer: "We take data security seriously. All user data is encrypted and stored securely using industry-standard practices. We never share your personal information with third parties.",
    },
];

/**
 * Mock Library Documents
 * Used for empty state placeholders
 */
export const MOCK_LIBRARY_DOCS = [
    {
        id: 'mock-1',
        title: 'Indian Polity by M. Laxmikanth',
        type: 'Standard Books',
        uploadedAt: new Date('2024-01-15'),
        size: '45.2 MB',
    },
    {
        id: 'mock-2',
        title: 'NCERT Class 12 History',
        type: 'NCERTs',
        uploadedAt: new Date('2024-01-20'),
        size: '28.5 MB',
    },
];

/**
 * Helper function to get mock questions by topic
 * @param {string} topic - Topic name
 * @param {number} count - Number of questions to return
 * @returns {Array} Array of mock questions
 */
export const getMockQuestionsByTopic = (topic, count = 5) => {
    const topicData = MOCK_QUESTIONS.find(t => t.topic === topic);
    if (!topicData) return [];

    const questions = topicData.questions;
    const selectedQuestions = [];

    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * questions.length);
        selectedQuestions.push({
            ...questions[randomIndex],
            id: `mock-${topic}-${i}-${Date.now()}`,
            topic,
        });
    }

    return selectedQuestions;
};

/**
 * Generate mixed mock questions across topics
 * @param {number} count - Total number of questions
 * @returns {Array} Array of mock questions
 */
export const generateMixedMockQuestions = (count = 20) => {
    const topics = MOCK_QUESTIONS.map(t => t.topic);
    const questionsPerTopic = Math.ceil(count / topics.length);

    const allQuestions = [];
    topics.forEach(topic => {
        const questions = getMockQuestionsByTopic(topic, questionsPerTopic);
        allQuestions.push(...questions);
    });

    // Shuffle and return requested count
    return allQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
};
