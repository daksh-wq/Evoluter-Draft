export const toast = {
    success: (message) => window.dispatchEvent(new CustomEvent('add-toast', { detail: { type: 'success', message } })),
    error: (message) => window.dispatchEvent(new CustomEvent('add-toast', { detail: { type: 'error', message } })),
    info: (message) => window.dispatchEvent(new CustomEvent('add-toast', { detail: { type: 'info', message } })),
    warning: (message) => window.dispatchEvent(new CustomEvent('add-toast', { detail: { type: 'warning', message } })),
};
