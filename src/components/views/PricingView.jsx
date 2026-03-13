
import React from 'react';
import { motion } from 'framer-motion';
import { 
    Check, Zap, Trophy, Rocket, ShieldCheck, Globe, Headphones
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { PublicNavbar } from '../common';
import { ROUTES } from '../../constants/routes';

const PricingView = () => {
    const navigate = useNavigate();
    const { user, handleLogout } = useAuth();

    const plans = [
        {
            id: '3mo',
            title: "3 Months",
            price: "₹499",
            name: "Sprinter",
            iconType: 'rocket',
            features: [
                "Fuel your finals for the cost of just two Happy Meals!",
                "Short-term focus, long-term impact. Perfect for that final push."
            ],
            color: "bg-blue-50",
            borderColor: "border-blue-100",
            buttonColor: "bg-[#2278B0] hover:bg-[#1b5f8a] shadow-[#2278B0]/20"
        },
        {
            id: '6mo',
            title: "6 Months",
            price: "₹699",
            name: "Half Marathon",
            iconType: 'zap',
            features: [
                "Master your syllabus one bite at a time. More value than a weekend at the food court.",
                "The most popular choice amongst serious candidates",
                "Secure half a year for less than a pair of movie tickets."
            ],
            popular: true,
            color: "bg-purple-50",
            borderColor: "border-purple-100",
            buttonColor: "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20"
        },
        {
            id: '12mo',
            title: "12 Months",
            price: "₹999",
            name: "Full Marathon",
            tagline: '"The Ultimate Evoluter"',
            iconType: 'trophy',
            features: [
                "The Best Value: A full year of 'PRAGATI'",
                "Total mastery costs less than one fancy dinner.",
                "Best value for committed learners"
            ],
            color: "bg-amber-50",
            borderColor: "border-amber-100",
            buttonColor: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
        }
    ];

    const getIcon = (type) => {
        switch(type) {
            case 'rocket': return <Rocket className="w-8 h-8 text-[#2278B0]" />;
            case 'zap': return <Zap className="w-8 h-8 text-purple-600" />;
            case 'trophy': return <Trophy className="w-8 h-8 text-amber-600" />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 selection:bg-[#2278B0]/20 font-sans">
            <PublicNavbar 
                user={user} 
                onLogout={handleLogout} 
                onGetStarted={() => navigate(ROUTES.LOGIN)} 
            />

            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 py-12 sm:py-20 lg:py-24 relative overflow-hidden">
                {/* Background Decorations for Premium Feel */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#2278B0]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 -z-10" />
                <div className="absolute bottom-10 left-0 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 -z-10" />

                {/* Header Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12 sm:mb-20"
                >
                    <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-full bg-[#2278B0]/5 border border-[#2278B0]/10 mb-6">
                        <span className="text-[10px] sm:text-xs font-black text-[#2278B0] uppercase tracking-[0.2em]">Investment in Success</span>
                    </div>
                    <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 text-slate-900 tracking-tight leading-[1.1]">
                        Simple, Transparent <br className="hidden sm:block" />
                        <span className="text-[#2278B0]">Pricing.</span>
                    </h1>
                    <p className="text-slate-500 text-base sm:text-lg md:text-xl max-w-2xl mx-auto font-medium px-4">
                        Accelerate your UPSC preparation with India's most advanced AI-powered prep engine. 
                        No credit card required. Cancel anytime.
                    </p>
                </motion.div>

                {/* Pricing Cards Grid - Responsive across 6 breakpoints */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-6 xl:gap-8 items-stretch pt-4">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex flex-col relative bg-white rounded-[2.5rem] border-2 ${plan.borderColor} p-6 sm:p-8 lg:p-8 xl:p-10 shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-2 hover:shadow-2xl overflow-hidden group`}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute top-0 right-0 z-20">
                                    <div className="bg-purple-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] px-8 py-2 rotate-45 translate-x-10 translate-y-4 shadow-lg">
                                        Popular
                                    </div>
                                </div>
                            )}

                            <div className="mb-8">
                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${plan.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                                    {getIcon(plan.iconType)}
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">{plan.title}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl sm:text-5xl font-black text-[#2278B0] tracking-tighter">{plan.price}</span>
                                    <span className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest">/ Access</span>
                                </div>
                            </div>

                            <div className="mb-10 grow">
                                <h4 className="text-slate-900 font-bold text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#2278B0]" />
                                    {plan.name}
                                </h4>
                                {plan.tagline && (
                                    <p className="text-purple-600 text-[10px] sm:text-xs font-black mb-6 italic opacity-80 bg-purple-50 inline-block px-3 py-1 rounded-full">{plan.tagline}</p>
                                )}
                                <ul className="space-y-4">
                                    {plan.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-start gap-3">
                                            <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                                                <Check className="w-3 h-3 text-green-600" />
                                            </div>
                                            <p className="text-slate-600 text-sm font-medium leading-relaxed">
                                                {feature}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Link 
                                to={ROUTES.CHECKOUT}
                                state={{ plan }}
                                className={`w-full block text-center py-4 sm:py-5 rounded-2xl ${plan.buttonColor} text-white font-black text-xs sm:text-sm uppercase tracking-[0.2em] transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] mt-4 shadow-indigo-500/10`}
                            >
                                Get Started Now
                            </Link>

                            {/* Sublte pattern overlay */}
                            <div className="absolute top-0 right-0 -z-10 opacity-5 pointer-events-none translate-x-1/2 -translate-y-1/2">
                                <div className="w-64 h-64 border-[40px] border-[#2278B0] rounded-full" />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trust Badges Section */}
                <div className="mt-16 sm:mt-24 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 border-t border-slate-100 pt-16">
                    <TrustBadge icon={<ShieldCheck className="text-green-500" />} label="Secure" desc="SSL Encrypted" />
                    <TrustBadge icon={<Zap className="text-orange-500" />} label="Instant" desc="Start now" />
                    <TrustBadge icon={<Globe className="text-blue-500" />} label="Relevant" desc="UPSC Optimized" />
                    <TrustBadge icon={<Headphones className="text-purple-500" />} label="Support" desc="24/7 Human help" />
                </div>
            </div>

            {/* Simple Premium Footer */}
            <footer className="mt-12 sm:mt-20 border-t border-slate-100 py-12 px-6 bg-slate-50/50">
                <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] text-center">
                        &copy; 2026 Evoluter Ecosystem &bull; Empowering Leaders &bull; Secured with Firebase
                    </p>
                </div>
            </footer>
        </div>
    );
};

const TrustBadge = ({ icon, label, desc }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:bg-[#2278B0] group-hover:text-white transition-all duration-300">
            {React.cloneElement(icon, { size: 24, className: 'transition-colors' })}
        </div>
        <div>
            <div className="text-sm font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">{label}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{desc}</div>
        </div>
    </div>
);

export default PricingView;
