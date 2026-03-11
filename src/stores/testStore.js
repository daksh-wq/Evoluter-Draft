import { create } from 'zustand';

/**
 * Test Store
 * Manages test configuration and quick-access test metadata
 */
const useTestStore = create((set) => ({
    // Test configuration
    selectedTopic: null,
    selectedDifficulty: 'Hard',
    selectedQuestionCount: 10,

    setTestConfig: (config) => set((state) => ({
        selectedTopic: config.topic ?? state.selectedTopic,
        selectedDifficulty: config.difficulty ?? state.selectedDifficulty,
        selectedQuestionCount: config.count ?? state.selectedQuestionCount,
    })),

    // Recent test results cache
    recentTests: [],
    addRecentTest: (test) => set((state) => ({
        recentTests: [test, ...state.recentTests].slice(0, 10) // Keep last 10
    })),
    clearRecentTests: () => set({ recentTests: [] }),

    // Test generation state
    isGenerating: false,
    generationProgress: 0,
    setGenerating: (isGenerating, progress = 0) => set({ isGenerating, generationProgress: progress }),

    // Reset
    reset: () => set({
        selectedTopic: null,
        selectedDifficulty: 'Hard',
        selectedQuestionCount: 10,
        recentTests: [],
        isGenerating: false,
        generationProgress: 0,
    }),
}));

export default useTestStore;
