import { useState, useEffect } from 'react';
import { callGemini } from '../services/geminiService';
import logger from '../utils/logger';

const CACHE_KEY = 'daily_wisdom_v2'; // bumped version to bust old corrupted cache
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const FALLBACK_QUOTES = [
    { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
    { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
    { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
    { text: "You don't have to be great to start, but you have to start to be great.", author: 'Zig Ziglar' },
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
    { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
];

/**
 * Validate that the AI returned a proper quote and not evaluation/markdown text.
 */
const isValidQuote = (text) => {
    if (!text || text.length > 350) return false;
    const invalidPatterns = /^#{1,3}\s|^\*\*|Strengths|Weaknesses|Improvement|###|^\-\s/m;
    return !invalidPatterns.test(text);
};

export const useDailyWisdom = () => {
    // Day-based fallback so we show something immediately
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const [quote, setQuote] = useState(FALLBACK_QUOTES[dayOfYear % FALLBACK_QUOTES.length]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWisdom = async () => {
            try {
                // Check cache
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { text, author, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION && isValidQuote(text)) {
                        setQuote({ text, author: author || '' });
                        setLoading(false);
                        return;
                    }
                }

                // Fetch new from AI with a very strict prompt
                const prompt = `Give me ONE short motivational quote for a UPSC exam student.
Your response MUST follow this exact format (nothing else, no extra text):
"[quote text here]" - [Author Name]

Example: "The secret of getting ahead is getting started." - Mark Twain`;

                const raw = await callGemini(prompt, false);

                if (raw && isValidQuote(raw)) {
                    // Parse "text" — Author format
                    const match = raw.trim().match(/^["\u201c]?(.+?)["\u201d]?\s*[-\u2014]\s*(.+)$/s);
                    if (match) {
                        const parsed = { text: match[1].trim(), author: match[2].trim() };
                        setQuote(parsed);
                        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...parsed, timestamp: Date.now() }));
                    } else {
                        const parsed = { text: raw.trim().replace(/^["\u201c]|["\u201d]$/g, ''), author: '' };
                        setQuote(parsed);
                        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...parsed, timestamp: Date.now() }));
                    }
                }
            } catch (error) {
                logger.warn('Failed to fetch daily wisdom, using fallback', error);
            } finally {
                setLoading(false);
            }
        };

        fetchWisdom();
    }, []);

    return { quote, loading };
};
