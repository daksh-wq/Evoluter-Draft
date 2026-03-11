import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';

/**
 * RouteErrorBoundary
 * Catches errors in route components and displays a recoverable fallback UI
 */
class RouteErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        logger.error('Route Error Boundary caught error', {
            error: error.message,
            componentStack: errorInfo.componentStack,
            route: this.props.routeName || 'unknown'
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <RouteErrorFallback
                    error={this.state.error}
                    routeName={this.props.routeName}
                    onRetry={this.handleRetry}
                />
            );
        }
        return this.props.children;
    }
}

/**
 * Fallback UI for route errors
 */
const RouteErrorFallback = ({ error, routeName, onRetry }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={32} className="text-red-500" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Something went wrong
                </h2>
                <p className="text-slate-500 mb-2">
                    {routeName && (
                        <span className="text-slate-600 font-medium">
                            Error in {routeName}
                        </span>
                    )}
                </p>

                {import.meta.env.DEV && error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                        <p className="text-red-800 text-sm font-mono break-words">
                            {error.message}
                        </p>
                    </div>
                )}

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center gap-2 bg-indigo-950 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-900 transition-all"
                    >
                        <RefreshCw size={18} /> Try Again
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
                    >
                        <Home size={18} /> Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RouteErrorBoundary;
