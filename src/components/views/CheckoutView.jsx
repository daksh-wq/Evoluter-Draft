
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Check, ArrowLeft, ShieldCheck, Zap, 
    Gift, Timer, CreditCard, ChevronRight,
    Lock, Sparkles, Star
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PublicNavbar } from '../common';
import { useAuth } from '../../hooks';
import { ROUTES } from '../../constants/routes';
import { toast } from '../../utils/toast';
import logo from '../../assets/logo1.png';

const CheckoutView = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, handleLogout } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);

    // Selected plan from PricingView with fallback
    const selectedPlan = location.state?.plan || {
        id: '6mo',
        title: "6 Months",
        price: "₹699",
        name: "Half Marathon",
        features: [
            "Master your syllabus one bite at a time. More value than a weekend at the food court.",
            "The most popular choice amongst serious candidates",
            "Secure half a year for less than a pair of movie tickets."
        ]
    };

    const couponCode = "EVOLUTER 2026";
    const trialDuration = "2 Weeks";

    const handleConfirm = async () => {
        if (!user) {
            toast.error("Please login to activate your plan");
            navigate(ROUTES.LOGIN);
            return;
        }

        setIsProcessing(true);
        try {
            // Update user document in Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                hasPremiumPlan: true,
                planType: selectedPlan.id,
                planActivatedAt: new Date().toISOString(),
                trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            });

            toast.success("Premium Trial Activated! 2 Weeks Full Access Granted.");
            
            // Artificial delay for UX feel
            setTimeout(() => {
                setIsProcessing(false);
                navigate(ROUTES.DASHBOARD);
            }, 1000);
        } catch (error) {
            console.error('Activation error:', error);
            toast.error("Failed to activate plan. Please try again.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFF] text-slate-900 font-sans selection:bg-[#2278B0]/10">
            <PublicNavbar 
                user={user} 
                onLogout={handleLogout} 
                onGetStarted={() => navigate(ROUTES.LOGIN)} 
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
                {/* Back Link */}
                <motion.button 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(ROUTES.PRICING)}
                    className="flex items-center gap-2 text-slate-400 hover:text-[#2278B0] font-bold text-xs sm:text-sm mb-6 sm:mb-10 transition-all group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    BACK TO PRICING
                </motion.button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
                    
                    {/* LEFT COLUMN: 7/12 width on large screens */}
                    <div className="lg:col-span-7 space-y-8 sm:space-y-12">
                        <section>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-3 tracking-tight">
                                    Review Your <span className="text-[#2278B0]">Plan</span>
                                </h1>
                                <p className="text-slate-500 font-medium text-base sm:text-lg">
                                    Confirm your selection and activate your free journey with Evoluter's Premium features.
                                </p>
                            </motion.div>
                        </section>

                        {/* Plan Card (Light Aesthetic) */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="relative group mt-8"
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2278B0]/20 to-purple-500/20 rounded-[2.5rem] blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-100 shadow-xl shadow-slate-200/40">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-[#2278B0]/5 rounded-2xl flex items-center justify-center border border-[#2278B0]/10">
                                            <Sparkles className="text-[#2278B0] w-8 h-8" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] sm:text-xs font-black text-[#2278B0] uppercase tracking-[0.2em] mb-1">
                                                {selectedPlan.name || 'Premium Plan'}
                                            </div>
                                            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900">
                                                {selectedPlan.title} Access
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sm:text-right flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                                        <div className="text-slate-300 text-sm sm:text-base font-bold line-through">
                                            {selectedPlan.price}
                                        </div>
                                        <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900">
                                            ₹0
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] pt-4 border-t border-slate-50">
                                        Included Features
                                    </h4>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {selectedPlan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                                                    <Check size={12} className="text-green-500" />
                                                </div>
                                                <span className="text-sm text-slate-600 font-medium leading-relaxed">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>

                        {/* Trust Badges - Optimized for Mobile Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <TrustBadge 
                                icon={<ShieldCheck className="text-green-500" size={24} />} 
                                title="Secure Trial" 
                                desc="No credit card required" 
                            />
                            <TrustBadge 
                                icon={<Timer className="text-orange-500" size={24} />} 
                                title={`${trialDuration} Free`} 
                                desc="Full premium access" 
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: 5/12 width on large screens */}
                    <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-slate-900 text-white rounded-[3rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden"
                        >
                            {/* Visual flair */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-[#2278B0] rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full blur-[80px] opacity-10 translate-y-1/2 -translate-x-1/2" />

                            <div className="relative z-10">
                                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                                    Summary
                                    <div className="h-px bg-slate-800 flex-grow" />
                                </h2>

                                <div className="space-y-6 mb-10">
                                    <div className="flex justify-between items-center text-slate-400 font-bold text-sm sm:text-base">
                                        <span>Plan Amount</span>
                                        <span className="line-through">{selectedPlan.price}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-green-400 font-bold text-sm sm:text-base bg-green-400/5 px-4 py-3 rounded-2xl border border-green-400/10">
                                        <span className="flex items-center gap-2">
                                            <Gift size={16} /> Coupon Code
                                        </span>
                                        <span>-{selectedPlan.price}</span>
                                    </div>
                                    <div className="pt-8 border-t border-slate-800 flex justify-between items-end">
                                        <div>
                                            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Payable</div>
                                            <span className="text-lg font-black uppercase tracking-widest text-slate-300">Order Total</span>
                                        </div>
                                        <div className="text-4xl sm:text-5xl font-black text-[#2278B0]">₹0</div>
                                    </div>
                                </div>

                                {/* Coupon Status */}
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-10 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#2278B0] rounded-full flex items-center justify-center shadow-lg shadow-[#2278B0]/40">
                                            <Check size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-[#2278B0] uppercase tracking-widest mb-0.5">Auto-Applied</div>
                                            <div className="text-sm font-black text-white tracking-widest">{couponCode}</div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleConfirm}
                                    disabled={isProcessing}
                                    className="w-full py-5 bg-[#2278B0] hover:bg-[#1b5f8a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl shadow-[#2278B0]/40 flex items-center justify-center gap-3 group overflow-hidden relative"
                                >
                                    {isProcessing ? (
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Activate Free Trial</span>
                                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                    {/* Sublte button shine effect */}
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                </button>

                                <div className="mt-10 flex flex-col items-center gap-4">
                                    <div className="flex -space-x-2">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                                                <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" className="w-full h-full object-cover opacity-80" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                        Trusted by 35,000+ UPSC Aspirants
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* Premium Footer */}
            <footer className="mt-20 border-t border-slate-100 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-6">
                    <div className="flex items-center gap-3 grayscale opacity-30 invert">
                        <img src={logo} alt="Evoluter" className="h-8" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                        &copy; 2026 EVOLUTER ECOSYSTEM &bull; SECURE TRIAL ACTIVATION
                    </p>
                    <div className="flex items-center gap-6 text-slate-300">
                        <Star size={12} />
                        <Star size={12} />
                        <Star size={12} />
                    </div>
                </div>
            </footer>
        </div>
    );
};

const TrustBadge = ({ icon, title, desc }) => (
    <motion.div 
        whileHover={{ y: -5 }}
        className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center gap-5 shadow-sm hover:shadow-md transition-all sm:flex-1"
    >
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0">
            {icon}
        </div>
        <div>
            <div className="text-sm font-black text-slate-900 leading-none mb-1.5">{title}</div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest">{desc}</div>
        </div>
    </motion.div>
);

export default CheckoutView;
