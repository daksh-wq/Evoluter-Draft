import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ToastContainer from './components/ui/ToastContainer.jsx'
import { ErrorBoundary } from './components/common'
import { handleError, ErrorSeverity, ErrorCategory } from './utils/errorHandler'

// ─── Global Error Handlers ───────────────────────────────────────────────────
// Catch unhandled promise rejections (e.g., forgotten .catch() on async calls)
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  handleError(
    event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
    'An unexpected error occurred. Please refresh the page.',
    ErrorSeverity.SILENT,
    ErrorCategory.UNKNOWN,
    { source: 'unhandledrejection' }
  );
});

// Catch uncaught runtime errors
window.addEventListener('error', (event) => {
  // Ignore ResizeObserver errors (benign browser quirk)
  if (event.message?.includes('ResizeObserver')) return;

  handleError(
    event.error || new Error(event.message),
    'Something went wrong. Please refresh the page.',
    ErrorSeverity.SILENT,
    ErrorCategory.UNKNOWN,
    { source: 'window.onerror', filename: event.filename, lineno: event.lineno }
  );
});

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ToastContainer />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>,
)
