import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Zap, AlertTriangle, RefreshCw, Mail, Lock, User, ArrowRight, X, KeyRound, CheckCircle, Home, LayoutDashboard, Building2 } from 'lucide-react';
import logger from '../../utils/logger';
import logo from '../../assets/logo1.png';

/**
 * LoginView Component
 * Authentication login page with Google Sign-In, Email/Password options,
 * and Password Reset flow
 */
const LoginView = ({ handleGoogleLogin, handleEmailLogin, handleEmailSignup, authLoading, loginError }) => {
    // Modes: 'signin', 'signup', 'institution'
    const [displayMode, setDisplayMode] = useState('signin');
    const [flipState, setFlipState] = useState('idle'); // 'idle' | 'out' | 'in'

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const location = useLocation();

    // Check for role intent
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const roleIntent = params.get('role');

        if (roleIntent === 'institution') {
            setDisplayMode('institution');
            sessionStorage.setItem('onboarding_role_intent', 'institution');
        } else {
            sessionStorage.removeItem('onboarding_role_intent');
        }
    }, [location]);

    // Handle Tab/Mode Switching
    const handleModeChange = (mode) => {
        if (mode === displayMode) return;

        if ((displayMode === 'signin' && mode !== 'signin') || 
            (displayMode !== 'signin' && mode === 'signin')) {
            setFlipState('out');
            setTimeout(() => {
                setDisplayMode(mode);
                setFlipState('in');
                setTimeout(() => {
                    setFlipState('idle');
                }, 250);
            }, 250);
        } else {
            setDisplayMode(mode);
        }

        if (mode === 'institution') {
            sessionStorage.setItem('onboarding_role_intent', 'institution');
        } else if (mode === 'signup') {
            sessionStorage.setItem('onboarding_role_intent', 'student');
        } else {
            sessionStorage.removeItem('onboarding_role_intent');
        }
    }

    // Password Reset State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (displayMode === 'signin') {
            handleEmailLogin(formData.email, formData.password);
        } else {
            // Both signup and institution modes use email signup
            handleEmailSignup(formData.name, formData.email, formData.password);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setResetError('');
        setResetLoading(true);

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetSent(true);
            logger.info('Password reset email sent', { email: resetEmail });
        } catch (error) {
            logger.error('Password reset failed', error);
            const errorMessages = {
                'auth/user-not-found': 'No account found with this email address.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/too-many-requests': 'Too many requests. Please try again later.',
            };
            setResetError(errorMessages[error.code] || 'Failed to send reset email. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const closeResetModal = () => {
        setShowResetModal(false);
        setResetSent(false);
        setResetEmail('');
        setResetError('');
    };

    const openResetModal = () => {
        setResetEmail(formData.email || '');
        setShowResetModal(true);
    };

    return (
        <div className="min-h-screen h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-orange-50 flex items-center justify-center p-6 font-sans text-slate-800 relative overflow-y-auto">
            <style>
                {`
                @keyframes flipOut {
                    from { transform: perspective(1000px) rotateY(0deg); opacity: 1; }
                    to { transform: perspective(1000px) rotateY(90deg); opacity: 0; }
                }
                @keyframes flipIn {
                    from { transform: perspective(1000px) rotateY(-90deg); opacity: 0; }
                    to { transform: perspective(1000px) rotateY(0deg); opacity: 1; }
                }
                .flip-out { animation: flipOut 0.25s ease-in forwards; }
                .flip-in { animation: flipIn 0.25s ease-out forwards; }
                `}
            </style>
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#2278B0]/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Back to Home Button */}
            <Link to="/" className="absolute top-6 right-6 md:top-10 md:right-10 p-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full text-slate-600 hover:text-[#2278B0] hover:border-[#2278B0]/30 transition-all shadow-sm hover:shadow-md z-20 group" title="Back to Home">
                <Home size={20} className="group-hover:scale-110 transition-transform" />
            </Link>

            <div className={`w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 md:p-10 relative z-10 mt-16 md:mt-0 ${flipState === 'out' ? 'flip-out' : flipState === 'in' ? 'flip-in' : 'animate-in fade-in zoom-in duration-500'}`}>

                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 mb-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                        <img src={logo} alt="Evoluter" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                        {displayMode === 'signin' ? "Welcome Back" : (displayMode === 'institution' ? "Partner with Us" : "Join the Evolution")}
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        {displayMode === 'institution' ? "Institution Portal" : "Intelligent Exam Ecosystem"}
                    </p>
                </div>

                {/* Tab Switcher - Only display for signup modes */}
                {displayMode !== 'signin' && (
                    <div className="flex p-1 bg-slate-50 rounded-xl mb-6 border border-slate-100 relative">
                        {/* Student Signup */}
                        <button
                            type="button"
                            onClick={() => handleModeChange('signup')}
                            className={`flex-1 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-[13px] font-bold transition-all z-10 ${displayMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Student
                        </button>

                        {/* Institution Signup */}
                        <button
                            type="button"
                            onClick={() => handleModeChange('institution')}
                            className={`flex-1 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-[13px] font-bold transition-all z-10 flex items-center justify-center gap-1 ${displayMode === 'institution' ? 'bg-indigo-950 text-white shadow-sm' : 'text-indigo-900/60 hover:text-indigo-900'}`}
                        >
                            Institution
                        </button>
                    </div>
                )}

                {/* Error Message */}
                {loginError && (
                    <div className="flex flex-col gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 mb-6">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={14} />
                            {loginError}
                        </div>
                        {loginError === 'Account already exists. Please Sign In.' && (
                            <button
                                type="button"
                                onClick={() => handleModeChange('signin')}
                                className="self-start text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors font-bold"
                            >
                                Go to Login
                            </button>
                        )}
                    </div>
                )}

                {/* Auth Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {displayMode !== 'signin' && (
                        <div className="relative animate-in slide-in-from-top-2 duration-300">
                            {displayMode === 'institution' ? <Building2 size={18} className="absolute left-4 top-3.5 text-slate-400" /> : <User size={18} className="absolute left-4 top-3.5 text-slate-400" />}
                            <input
                                type="text"
                                name="name"
                                autoComplete="name"
                                placeholder={displayMode === 'institution' ? "Institution Name" : "Full Name"}
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2278B0] focus:ring-2 focus:ring-[#2278B0]/20 font-medium text-sm transition-all"
                            />
                        </div>
                    )}

                    <div className="relative">
                        <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
                        <input
                            type="text"
                            inputMode="email"
                            name="email"
                            autoComplete="email"
                            placeholder="Email Address"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2278B0] focus:ring-2 focus:ring-[#2278B0]/20 font-medium text-sm transition-all"
                        />
                    </div>

                    <div className="relative">
                        <Lock size={18} className="absolute left-4 top-3.5 text-slate-400" />
                        <input
                            type="password"
                            name="password"
                            autoComplete={displayMode === 'signin' ? "current-password" : "new-password"}
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2278B0] focus:ring-2 focus:ring-[#2278B0]/20 font-medium text-sm transition-all"
                        />
                    </div>

                    {/* Forgot Password Link - Only for Sign In */}
                    {displayMode === 'signin' && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={openResetModal}
                                className="text-sm text-[#2278B0] hover:text-[#1a5f8a] hover:underline font-medium transition-colors"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={authLoading}
                        className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed ${displayMode === 'institution' ? 'bg-indigo-950 hover:bg-indigo-900' : 'bg-[#2278B0] hover:bg-[#1b5f8a]'}`}
                    >
                        {authLoading ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : (
                            <>
                                {displayMode === 'signin' ? 'Login' : (displayMode === 'institution' ? 'Register Institution' : 'Create Student Account')} <ArrowRight size={18} />
                            </>
                        )}
                    </button>

                    {/* Toggle between Sign In / Sign Up */}
                    <div className="text-center mt-4">
                        {displayMode !== 'signin' ? (
                            <p className="text-sm text-slate-500 font-medium">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => handleModeChange('signin')}
                                    className="text-[#2278B0] hover:text-[#1a5f8a] hover:underline font-bold transition-colors"
                                >
                                    Login
                                </button>
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500 font-medium">
                                Don't have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => handleModeChange('signup')}
                                    className="text-[#2278B0] hover:text-[#1a5f8a] hover:underline font-bold transition-colors"
                                >
                                    Sign Up
                                </button>
                            </p>
                        )}
                    </div>
                </form>

                <div className="my-6 flex items-center gap-4">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or continue with</span>
                    <div className="h-px bg-slate-200 flex-1" />
                </div>

                {/* Google Sign In Button */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={authLoading}
                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        className="w-5 h-5"
                    />
                    <span>Sign in with Google</span>
                </button>

                <div className="mt-8 text-center text-[10px] text-slate-400 font-medium">
                    By continuing, you agree to our Terms & Privacy Policy.
                </div>
            </div>

            {/* Password Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        {/* Close Button */}
                        <button
                            onClick={closeResetModal}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        >
                            <X size={18} />
                        </button>

                        {!resetSent ? (
                            <>
                                {/* Icon & Title */}
                                <div className="text-center mb-6">
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-[#2278B0]/10 rounded-2xl mb-4">
                                        <KeyRound size={28} className="text-[#2278B0]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900">Reset Password</h3>
                                    <p className="text-slate-500 text-sm mt-2">
                                        Enter your email address and we'll send you a link to reset your password.
                                    </p>
                                </div>

                                {/* Error */}
                                {resetError && (
                                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 mb-4">
                                        <AlertTriangle size={14} />
                                        {resetError}
                                    </div>
                                )}

                                {/* Reset Form */}
                                <form onSubmit={handlePasswordReset}>
                                    <div className="relative mb-4">
                                        <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                        <input
                                            type="email"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            placeholder="Enter your email address"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2278B0] focus:ring-2 focus:ring-[#2278B0]/20 font-medium text-sm transition-all"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="w-full bg-[#2278B0] hover:bg-[#1a5f8a] text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {resetLoading ? (
                                            <RefreshCw size={18} className="animate-spin" />
                                        ) : (
                                            'Send Reset Link'
                                        )}
                                    </button>
                                </form>

                                <button
                                    onClick={closeResetModal}
                                    className="w-full mt-3 text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition-colors"
                                >
                                    Back to Login
                                </button>
                            </>
                        ) : (
                            /* Success State */
                            <div className="text-center py-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                                    <CheckCircle size={32} className="text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Check Your Email</h3>
                                <p className="text-slate-500 text-sm mb-1">
                                    We've sent a password reset link to:
                                </p>
                                <p className="text-[#2278B0] font-bold text-sm mb-6">
                                    {resetEmail}
                                </p>
                                <p className="text-slate-400 text-xs mb-6">
                                    Didn't receive the email? Check your spam folder or try again.
                                </p>
                                <button
                                    onClick={closeResetModal}
                                    className="w-full bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginView;
