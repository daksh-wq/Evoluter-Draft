import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error: error, errorInfo: errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
                    <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} className="text-red-500" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Something went wrong</h1>
                        <p className="text-slate-500 mb-6">
                            An unexpected error occurred. Please try reloading.
                        </p>

                        {this.state.error && (
                            <div className="text-left bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono mb-6 overflow-auto max-h-48">
                                <p className="text-red-300 font-bold mb-2">{this.state.error.toString()}</p>
                                <pre>{this.state.errorInfo?.componentStack}</pre>
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 mx-auto"
                        >
                            <RefreshCw size={18} /> Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
