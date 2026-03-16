import { create } from 'zustand';

/**
 * User Store
 * Manages user profile, stats, and preferences — separate from auth
 */
const useUserStore = create((set, get) => ({
    // User profile data from Firestore
    userData: null,
    setUserData: (data) => set({ userData: data }),

    // User stats
    stats: {
        totalTestsTaken: 0,
        totalQuestionsSolved: 0,
        accuracy: 0,
        masteredCount: 0,
        streakDays: 0,
        xp: 0,
        level: 1,
        topicMastery: {
            History: 0,
            Economy: 0,
            Polity: 0,
            Science: 0,
            Geography: 0,
        },
    },
    setStats: (stats) => set({ stats }),
    updateStats: (updates) => set((state) => ({
        stats: { ...state.stats, ...updates }
    })),

    // User preferences
    preferences: {
        defaultDifficulty: 'Intermediate',
        defaultQuestionCount: 25,
        notificationsEnabled: true,
        darkMode: false,
    },
    setPreferences: (prefs) => set((state) => ({
        preferences: { ...state.preferences, ...prefs }
    })),

    // Level calculation
    getLevel: () => {
        const xp = get().stats.xp;
        return Math.floor(xp / 100) + 1;
    },

    // Reset on logout
    reset: () => set({
        userData: null,
        stats: {
            totalTestsTaken: 0,
            totalQuestionsSolved: 0,
            accuracy: 0,
            masteredCount: 0,
            streakDays: 0,
            xp: 0,
            level: 1,
            topicMastery: {
                History: 0,
                Economy: 0,
                Polity: 0,
                Science: 0,
                Geography: 0,
            },
        },
        preferences: {
            defaultDifficulty: 'Intermediate',
            defaultQuestionCount: 25,
            notificationsEnabled: true,
            darkMode: false,
        },
    }),
}));

export default useUserStore;
