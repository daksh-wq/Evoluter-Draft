import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTest as useTestHook } from '../hooks';
import { ROUTES } from '../constants/routes';

/**
 * TestContext
 * Manages test state and operations including timer
 */
const TestContext = createContext(null);

export const useTestContext = () => {
    const context = useContext(TestContext);
    if (!context) {
        throw new Error('useTestContext must be used within TestProvider');
    }
    return context;
};

export const TestProvider = ({ children }) => {
    const navigate = useNavigate();
    const testState = useTestHook();

    const {
        activeTest,
        timeLeft,
        setTimeLeft,
        startMockTest,
        startAITest,
        startCustomTest,
        exitTest,
    } = testState;

    // Timer effect
    useEffect(() => {
        let interval;
        if (activeTest && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeTest, timeLeft, setTimeLeft]);

    // Navigation-aware test starters
    const startMission = useCallback(() => {
        startMockTest();
        navigate(ROUTES.TEST);
    }, [startMockTest, navigate]);

    const handleGenerateAITest = useCallback(async (topic, count, difficulty, resourceContent = null, pyqPercentage = 0) => {
        await startAITest(topic, count, difficulty, 'UPSC CSE', resourceContent, pyqPercentage);
        navigate(ROUTES.TEST);
    }, [startAITest, navigate]);

    const handleStartCustomTest = useCallback((questions, testName) => {
        startCustomTest(questions, testName);
        navigate(ROUTES.TEST);
    }, [startCustomTest, navigate]);

    const value = {
        ...testState,
        startMission,
        handleGenerateAITest,
        handleStartCustomTest,
    };

    return (
        <TestContext.Provider value={value}>
            {children}
        </TestContext.Provider>
    );
};

export default TestContext;
