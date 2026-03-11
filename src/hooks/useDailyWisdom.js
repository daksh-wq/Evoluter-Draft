import { useState, useEffect } from 'react';
import { callGemini } from '../services/geminiService';
import logger from '../utils/logger';

const GEN_AI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const CACHE_KEY = 'daily_wisdom';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const FALLBACK_QUOTES = [
    '"Success is the sum of small efforts, repeated day in and day out." - Robert Collier',
    '"The future belongs to those who believe in the beauty of their dreams." - Eleanor Roosevelt',
    '"It does not matter how slowly you go as long as you do not stop." - Confucius',
    '"You don’t have to be great to start, but you have to start to be great." - Zig Ziglar',
    '"The only way to do great work is to love what you do." - Steve Jobs'
];

export const useDailyWisdom = () => {
    const [quote, setQuote] = useState(FALLBACK_QUOTES[0]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWisdom = async () => {
            try {
                // Check Cache
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { text, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        setQuote(text);
                        setLoading(false);
                        return;
                    }
                }

                if (!GEN_AI_KEY) throw new Error("No API Key");

                // Fetch new from AI
                const prompt = "Generate a short, powerful motivational quote for a student preparing for a tough exam (like UPSC). Return ONLY the quote and author, no extra text.";
                const text = await callGemini(prompt, false);

                if (text) {
                    const cleanText = text.trim().replace(/^"|"$/g, '');
                    setQuote(cleanText);
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        text: cleanText,
                        timestamp: Date.now()
                    }));
                }
            } catch (error) {
                logger.warn("Failed to fetch daily wisdom, using fallback", error);
                // Rotate fallback based on day of year
                const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
                setQuote(FALLBACK_QUOTES[dayOfYear % FALLBACK_QUOTES.length]);
            } finally {
                setLoading(false);
            }
        };

        fetchWisdom();
    }, []);

    return { quote, loading };
};
