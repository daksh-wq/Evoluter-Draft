import { create } from 'zustand';

/**
 * UI Store
 * Manages global UI state: sidebar, modals, theme, notifications
 */
const useUIStore = create((set) => ({
    // Sidebar
    isSidebarOpen: false,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    openSidebar: () => set({ isSidebarOpen: true }),
    closeSidebar: () => set({ isSidebarOpen: false }),

    // Zen Mode (fullscreen test mode)
    isZenMode: false,
    toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),
    setZenMode: (value) => set({ isZenMode: value }),

    // Loading overlay
    isGlobalLoading: false,
    globalLoadingMessage: '',
    showGlobalLoading: (message = 'Loading...') => set({ isGlobalLoading: true, globalLoadingMessage: message }),
    hideGlobalLoading: () => set({ isGlobalLoading: false, globalLoadingMessage: '' }),

    // Toast notifications
    toasts: [],
    addToast: (toast) => set((state) => ({
        toasts: [...state.toasts, { id: Date.now(), ...toast }]
    })),
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
    })),
    clearToasts: () => set({ toasts: [] }),

    // Modal
    activeModal: null,
    modalProps: {},
    openModal: (modalName, props = {}) => set({ activeModal: modalName, modalProps: props }),
    closeModal: () => set({ activeModal: null, modalProps: {} }),
}));

export default useUIStore;
