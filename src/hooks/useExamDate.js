import { useState, useEffect } from 'react';
import { callGemini } from '../services/geminiService';
import logger from '../utils/logger';

const GEN_AI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const CACHE_KEY = 'exam_date_prediction';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const STATIC_EXAM_DATES = {
    2026: {
        'UPSC CSE': '2026-05-24',
        'UPSC': '2026-05-24',
        'NEET': '2026-05-03',
        'JEE Advanced': '2026-05-17',
        'JEE': '2026-01-24', // Mains Session 1 approx
        'GATE': '2026-02-07'
    },
    2025: {
        'UPSC CSE': '2025-05-25'
    }
};

export const useExamDate = (examName = 'UPSC CSE', targetYear) => {
    const [examDate, setExamDate] = useState(null);
    const [daysRemaining, setDaysRemaining] = useState(0);
    const [isOfficial, setIsOfficial] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const calculateDays = (dateStr) => {
            const date = new Date(dateStr);
            const diff = date - new Date();
            setDaysRemaining(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
        };

        const fetchDate = async () => {
            const year = targetYear || new Date().getFullYear();

            // 1. Check Static Dates First (Fastest & Most Reliable)
            const staticDate = STATIC_EXAM_DATES[year]?.[examName];

            if (staticDate) {
                calculateDays(staticDate);
                setExamDate(new Date(staticDate));
                setIsOfficial(true); // Treat static as official for UI confidence
                setLoading(false);
                return;
            }

            try {
                // 2. Check Cache
                const cached = localStorage.getItem(`${CACHE_KEY}_${examName}_${year}`);
                if (cached) {
                    const data = JSON.parse(cached);
                    if (Date.now() - data.timestamp < CACHE_DURATION) {
                        calculateDays(data.date);
                        setExamDate(new Date(data.date));
                        setIsOfficial(data.status === 'official');
                        setLoading(false);
                        return;
                    }
                }

                if (!GEN_AI_KEY) throw new Error("No API Key");

                // 3. Ask AI for best estimate
                const prompt = `What is the official or expected date for the ${examName} Preliminary Exam in ${year}? 
                Return strictly JSON format: {"date": "YYYY-MM-DD", "status": "official" or "tentative"}. 
                If uncertain, estimate based on past trends (usually late May/early June).`;

                const text = await callGemini(prompt, true);

                if (text) {
                    // Clean markdown code blocks if present
                    const jsonStr = text.replace(/```json|```/g, '').trim();
                    const data = JSON.parse(jsonStr);

                    if (data.date) {
                        calculateDays(data.date);
                        setExamDate(new Date(data.date));
                        setIsOfficial(data.status === 'official');

                        localStorage.setItem(`${CACHE_KEY}_${examName}_${year}`, JSON.stringify({
                            date: data.date,
                            status: data.status,
                            timestamp: Date.now()
                        }));
                    }
                }
            } catch (error) {
                logger.warn("Failed to fetch exam date, using fallback", error);
                // Fallback: Last Sunday of May is traditional for UPSC
                const fallbackDate = new Date(year, 4, 26); // May 26 approx
                calculateDays(fallbackDate);
                setExamDate(fallbackDate);
                setIsOfficial(false);
            } finally {
                setLoading(false);
            }
        };

        fetchDate();
    }, [examName, targetYear]);

    return { examDate, daysRemaining, isOfficial, loading };
};
