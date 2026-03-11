
import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import {
    ArrowRight, BookOpen, BarChart2, Brain, Users, Zap,
    Target, TrendingUp, Award, CheckCircle, ChevronDown,
    Menu, X, Clock, Trophy, Star, Plus, Minus,
    Send, Twitter, Linkedin, Github, Instagram, ExternalLink, LogOut, Building2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo1.png';

const HomeView = ({ onGetStarted, user, onLogout }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [faqOpen, setFaqOpen] = useState(null);
    const [activeSection, setActiveSection] = useState('');
    const navigate = useNavigate();

    // Smooth scroll handler for hash links
    const scrollTo = (hash) => {
        const id = hash.replace('#', '');
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setMobileMenuOpen(false);
    };

    // Smart link handler: routes go through React Router, hashes scroll
    const handleNavClick = (e, href) => {
        e.preventDefault();
        if (href.startsWith('#')) {
            scrollTo(href);
        } else if (href === '/dashboard' && !user) {
            navigate('/login');
        } else {
            navigate(href);
        }
    };

    useEffect(() => {
        const sections = ['features', 'about', 'how-it-works', 'faq'];
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, observerOptions);

        sections.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut"
            }
        }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="min-h-screen bg-white text-gray-900 selection:bg-[#2278B0]/20 selection:text-indigo-950">
            {/* Background Pattern */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
            />
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center space-x-3">
                            <div className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden">
                                <img src={logo} alt="Evoluter Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-6">
                            <NavLink href="/dashboard" onClick={handleNavClick}>Dashboard</NavLink>
                            <NavLink href="#about" active={activeSection === 'about'} onClick={handleNavClick}>About Us</NavLink>
                            <NavLink href="#features" active={activeSection === 'features'} onClick={handleNavClick}>Why Us</NavLink>
                            <NavLink href="#analytics" active={activeSection === 'analytics'} onClick={handleNavClick}>Analytics</NavLink>
                            <NavLink href="#how-it-works" active={activeSection === 'how-it-works'} onClick={handleNavClick}>How It Works</NavLink>
                            <NavLink href="#faq" active={activeSection === 'faq'} onClick={handleNavClick}>FAQ</NavLink>
                            {user ? (
                                <button
                                    onClick={onLogout}
                                    className="ml-4 px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition-all flex items-center space-x-2 text-xs"
                                >
                                    <LogOut size={14} />
                                    <span>Logout</span>
                                </button>
                            ) : (
                                <button
                                    onClick={onGetStarted}
                                    className="ml-4 px-5 py-2 bg-[#2278B0] hover:bg-[#1b5f8a] rounded-xl text-white font-bold transition-all shadow-lg shadow-[#2278B0]/20 hover:shadow-[#2278B0]/30 hover:-translate-y-0.5 text-sm"
                                >
                                    Get Started
                                </button>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden pb-4 space-y-3 border-t border-gray-100 pt-4">
                            <a href="/dashboard" onClick={(e) => handleNavClick(e, '/dashboard')} className="block text-gray-600 hover:text-gray-900 transition-colors text-sm">Dashboard</a>
                            <a href="#about" onClick={(e) => handleNavClick(e, '#about')} className="block text-gray-600 hover:text-gray-900 transition-colors text-sm">About Us</a>
                            <a href="#features" onClick={(e) => handleNavClick(e, '#features')} className="block text-gray-600 hover:text-gray-900 transition-colors text-sm">Why Us</a>
                            <a href="#analytics" onClick={(e) => handleNavClick(e, '#analytics')} className="block text-gray-600 hover:text-gray-900 transition-colors text-sm">Analytics</a>
                            <a href="#faq" onClick={(e) => handleNavClick(e, '#faq')} className="block text-gray-600 hover:text-gray-900 transition-colors text-sm">FAQ</a>
                            {user ? (
                                <button
                                    onClick={onLogout}
                                    className="w-full px-6 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 text-sm"
                                >
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            ) : (
                                <button
                                    onClick={onGetStarted}
                                    className="w-full px-6 py-2 bg-[#2278B0] hover:bg-[#1b5f8a] rounded-lg text-white font-medium transition-colors shadow-lg shadow-[#2278B0]/20 text-sm"
                                >
                                    Get Started
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center py-20 px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-6xl mx-auto text-center">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                    >
                        {/* Badge */}
                        <motion.div
                            variants={fadeInUp}
                            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#2278B0]/5 border border-[#2278B0]/10 mb-6"
                        >
                            <span className="text-sm font-medium text-[#2278B0]">AI-Powered Civil Services Preparation</span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            variants={fadeInUp}
                            className="text-4xl md:text-5xl lg:text-7xl font-black mb-6 text-indigo-950 leading-tight"
                        >
                            India's First AI-Powered <br className="hidden md:block" />
                            Smart Test Engine
                        </motion.h1>

                        {/* Subheadline */}
                        <motion.p
                            variants={fadeInUp}
                            className="text-lg md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed font-medium"
                        >
                            Practice smarter. Analyze deeper. Improve faster. <br className="hidden md:block" />
                            Tailored for UPSC and Indian competitive exam aspirants.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20"
                        >
                            <button
                                onClick={() => user ? navigate('/dashboard') : onGetStarted()}
                                className="px-10 py-4 bg-[#2278B0] hover:bg-[#1b5f8a] rounded-xl text-white font-bold shadow-xl shadow-[#2278B0]/20 transition-all hover:-translate-y-1 flex items-center space-x-3 text-lg"
                            >
                                <span>{user ? "Go to Dashboard" : "Start Smart Practice"}</span>
                                <Zap className="w-5 h-5 fill-white" />
                            </button>
                            <button
                                className="px-10 py-4 bg-white hover:bg-gray-50 border-2 border-[#2278B0]/20 rounded-xl font-bold text-[#2278B0] transition-all flex items-center space-x-3 text-lg"
                            >
                                <span>View Demo Analysis</span>
                                <BarChart2 className="w-5 h-5" />
                            </button>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            variants={fadeInUp}
                            className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto"
                        >
                            <StatCard icon={<Zap className="w-6 h-6 text-[#2278B0]" />} value="2.5M+" label="Questions Practiced" />
                            <StatCard icon={<Brain className="w-6 h-6 text-[#2278B0]" />} value="180K+" label="AI Analyses Delivered" />
                            <StatCard icon={<TrendingUp className="w-6 h-6 text-[#2278B0]" />} value="27%" label="Avg Score Improvement" />
                            <StatCard icon={<Users className="w-6 h-6 text-[#2278B0]" />} value="35K+" label="Active Aspirants" />
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* What We Do Section */}
            <section id="features" className="py-10 px-6 lg:px-8 bg-white overflow-hidden">
                <motion.div
                    className="max-w-7xl mx-auto"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeInUp} className="text-center mb-16">
                        <div className="inline-block px-4 py-1 rounded-full bg-[#2278B0]/5 border border-[#2278B0]/10 mb-4">
                            <span className="text-sm font-medium text-[#2278B0]">Why Us</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black mb-4 text-indigo-950">Why Evoluter</h2>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                            Comprehensive tools designed to accelerate your preparation and track your progress
                        </p>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
                        <FeatureCard
                            icon={<BarChart2 className="w-7 h-7 text-[#2278B0]" />}
                            title="AI Performance Breakdown"
                            description="Detailed analysis of your strengths and weaknesses across every subject and topic."
                        />
                        <FeatureCard
                            icon={<Brain className="w-7 h-7 text-[#2278B0]" />}
                            title="Smart Difficulty Adaptation"
                            description="Questions and tests that evolve with your learning level for maximum efficiency."
                        />
                        <FeatureCard
                            icon={<Clock className="w-7 h-7 text-[#2278B0]" />}
                            title="Time Efficiency Tracking"
                            description="Real-time analysis of time spent per question to optimize your speed and accuracy."
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-7 h-7 text-[#2278B0]" />}
                            title="Predictive Score Modeling"
                            description="Data-backed insights that predict your exam outcome based on current trends."
                        />
                    </motion.div>
                </motion.div>
            </section>

            {/* Who We Are Section */}
            <section id="about" className="py-10 px-6 lg:px-8">
                <motion.div
                    className="max-w-7xl mx-auto"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                >
                    {/* Centered Header */}
                    <div className="text-center mb-16">
                        <motion.div variants={fadeInUp} className="inline-block px-4 py-1 rounded-full bg-[#2278B0]/5 border border-[#2278B0]/10 mb-6">
                            <span className="text-sm font-medium text-[#2278B0]">Our Mission</span>
                        </motion.div>

                        <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-gray-900">
                            Who We Are
                        </motion.h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Text Content */}
                        <motion.div variants={fadeInUp}>
                            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                                Evoluter is a team of passionate educators, civil services mentors, and AI technologists united by a single mission: democratizing quality exam preparation for every aspirant.
                            </p>

                            <p className="text-base text-gray-600 mb-8 leading-relaxed">
                                We believe that success in civil services shouldn't depend on your location, background, or access to expensive coaching. Our AI-powered platform brings world-class preparation tools to your fingertips.
                            </p>

                            {/* Values */}
                            <div className="space-y-3 mb-8">
                                <ValueItem text="Evidence-based learning methodologies" />
                                <ValueItem text="Continuous innovation in EdTech" />
                                <ValueItem text="Accessible and affordable for all" />
                                <ValueItem text="Community-driven growth" />
                            </div>

                            {/* Mini Stats */}
                            <div className="grid grid-cols-2 gap-6">
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="text-3xl font-bold text-[#2278B0] mb-1">15k+</div>
                                    <div className="text-gray-600 text-sm">Happy Students</div>
                                </motion.div>
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="text-3xl font-bold text-[#2278B0] mb-1">92%</div>
                                    <div className="text-gray-600 text-sm">Success Rate</div>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Image */}
                        <motion.div
                            variants={fadeInUp}
                            className="relative"
                        >
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.3 }}
                                className="rounded-lg overflow-hidden shadow-lg border border-gray-200"
                            >
                                <img
                                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800"
                                    alt="Team Collaboration"
                                    className="w-full h-auto"
                                />
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-6 px-6 lg:px-8 bg-white overflow-hidden">
                <motion.div
                    className="max-w-7xl mx-auto"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeInUp} className="text-center mb-16">
                        <div className="inline-block px-4 py-1 rounded-full bg-[#2278B0]/5 border border-[#2278B0]/10 mb-4">
                            <span className="text-sm font-medium text-[#2278B0]">Process</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">How It Works</h2>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                            Get started in minutes and transform your preparation journey
                        </p>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        <ProcessStep
                            number="01"
                            icon={<Zap className="w-7 h-7 text-white" />}
                            title="Take Smart MCQ Tests"
                            description="Attempt high-quality tests designed to mimic real competitive exams."
                        />
                        <ProcessStep
                            number="02"
                            icon={<Brain className="w-7 h-7 text-white" />}
                            title="AI Performance Breakdown"
                            description="Our engine analyzes your patterns and detects your weak areas instantly."
                        />
                        <ProcessStep
                            number="03"
                            icon={<TrendingUp className="w-7 h-7 text-white" />}
                            title="Improve with Data Insights"
                            description="Use targeted recommendations to bridge gaps and master your preparation."
                        />
                    </motion.div>
                </motion.div>
            </section>

            {/* Performance Analytics Preview Section */}
            <section id="analytics" className="py-12 px-6 lg:px-8 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative rounded-[2.5rem] overflow-hidden bg-indigo-950 px-8 py-16 md:px-16 md:py-20 shadow-2xl"
                    >
                        {/* Mesh Gradient Background */}
                        <div className="absolute inset-0 opacity-40 pointer-events-none">
                            <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[80%] bg-[#2278B0] blur-[120px] rounded-full animate-pulse" />
                            <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[70%] bg-indigo-500 blur-[100px] rounded-full" />
                        </div>

                        {/* Decorative Background Grid */}
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#2278B0_1px,transparent_1px)] [background-size:40px_40px]" />
                        </div>

                        <div className="relative z-10">
                            {/* Centered Header - Matches CTA Style */}
                            <div className="text-center mb-16">
                                <motion.div
                                    variants={fadeInUp}
                                    viewport={{ once: true }}
                                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium mb-8 backdrop-blur-md"
                                >
                                    <Zap className="w-4 h-4 text-[#2278B0] fill-[#2278B0]" />
                                    <span>Try the future of learning for free</span>
                                </motion.div>

                                <motion.h2
                                    variants={fadeInUp}
                                    className="text-4xl md:text-5xl lg:text-7xl font-black mb-8 text-white leading-tight"
                                >
                                    Analyze Deeper. <br />
                                    <span className="text-[#2278B0]">Stop Guessing.</span>
                                </motion.h2>

                                <p className="text-xl text-blue-100/70 max-w-2xl mx-auto leading-relaxed font-medium">
                                    Our AI engine detects weak topics, tracks your accuracy heatmap, and analyzes time spent per question to give you actionable improvement suggestions.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                <motion.div variants={fadeInUp} className="space-y-8">
                                    <AnalyticsFeature
                                        icon={<Target className="w-5 h-5 text-[#2278B0]" />}
                                        title="Weak Topic Detection"
                                        desc="Identifies specific sub-topics where you consistently lose marks."
                                    />
                                    <AnalyticsFeature
                                        icon={<TrendingUp className="w-5 h-5 text-[#2278B0]" />}
                                        title="Accuracy Heatmap"
                                        desc="Visualize your performance trends over time and across different subjects."
                                    />
                                    <AnalyticsFeature
                                        icon={<Clock className="w-5 h-5 text-[#2278B0]" />}
                                        title="Time-per-Question Analysis"
                                        desc="See exactly where you're spending too much time during tests."
                                    />
                                </motion.div>

                                {/* Mock Dashboard UI */}
                                <motion.div
                                    variants={fadeInUp}
                                    className="relative"
                                >
                                    <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-4 md:p-8 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#2278B0]/20 to-transparent opacity-50" />

                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-8 relative z-10">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                                    <BarChart2 className="text-[#2278B0]" size={20} />
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold">Analytics Dashboard</div>
                                                    <div className="text-white/40 text-xs">Updated 2m ago</div>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-[#2278B0]/20 rounded-lg text-[#2278B0] text-[10px] font-black uppercase tracking-widest border border-[#2278B0]/30">Live</div>
                                        </div>

                                        {/* Main Stats */}
                                        <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                <div className="text-white/40 text-[10px] font-bold uppercase mb-1">Avg Accuracy</div>
                                                <div className="text-2xl font-black text-white">78.4%</div>
                                                <div className="text-green-400 text-[10px] font-bold mt-1">↑ +4.2%</div>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                                <div className="text-white/40 text-[10px] font-bold uppercase mb-1">Questions</div>
                                                <div className="text-2xl font-black text-white">1,240</div>
                                                <div className="text-blue-400 text-[10px] font-bold mt-1">Total Practiced</div>
                                            </div>
                                        </div>

                                        {/* Heatmap Mock */}
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 relative z-10">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-white/40 text-[10px] font-bold uppercase">Topic Mastery Heatmap</div>
                                                <div className="flex space-x-1">
                                                    {[...Array(4)].map((_, i) => <div key={i} className={`w-2 h-2 rounded-sm ${i === 3 ? 'bg-white/10' : 'bg-[#2278B0]'}`} />)}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {[...Array(28)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0 }}
                                                        whileInView={{ opacity: 1 }}
                                                        transition={{ delay: i * 0.02 }}
                                                        className={`h-4 rounded-sm ${i % 3 === 0 ? 'bg-[#2278B0]' : i % 5 === 0 ? 'bg-blue-400/40' : i % 7 === 0 ? 'bg-[#2278B0]/20' : 'bg-[#2278B0]/60'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* AI Recommendation Card */}
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            className="mt-6 bg-[#2278B0] rounded-2xl p-5 shadow-xl relative z-10"
                                        >
                                            <div className="flex items-start space-x-3">
                                                <Brain className="text-white w-5 h-5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-white font-bold text-sm mb-1">AI Recommendation</div>
                                                    <p className="text-white/80 text-xs leading-relaxed">
                                                        Based on your time-efficiency tracking, you spend extra time on Modern History. Bridge the gap using our "Quick Summary" sheets.
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Floating decorative elements */}
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#2278B0] blur-[60px] rounded-full opacity-50 animate-pulse" />
                                    <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-600 blur-[80px] rounded-full opacity-30" />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-20 px-6 lg:px-8 overflow-hidden bg-gray-50">
                <motion.div
                    className="max-w-7xl mx-auto"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeInUp} className="text-center mb-16">
                        <div className="inline-block px-4 py-1 rounded-full bg-[#2278B0]/5 border border-[#2278B0]/10 mb-4">
                            <span className="text-sm font-medium text-[#2278B0]">Success Stories</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">What Our Students Say</h2>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                            Join thousands of successful aspirants who transformed their preparation
                        </p>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <TestimonialCard
                            quote="Evoluter's AI evaluation helped me identify and fix my writing weaknesses. Cleared Mains in my second attempt!"
                            name="Priya Sharma"
                            achievement="IAS 2025 - AIR 47"
                            rating={5}
                        />
                        <TestimonialCard
                            quote="The personalized study plans kept me on track. The analytics showed exactly where I needed to focus more."
                            name="Rahul Verma"
                            achievement="IPS 2025 - AIR 89"
                            rating={5}
                        />
                        <TestimonialCard
                            quote="Best investment in my preparation. The AI-generated tests were exactly what I needed for conceptual clarity."
                            name="Anjali Reddy"
                            achievement="IFS 2024 - AIR 112"
                            rating={5}
                        />
                    </motion.div>
                </motion.div>
            </section>

            {/* For Institutions Section - NEW */}
            <section id="institutions" className="py-24 px-6 lg:px-8 bg-white overflow-hidden relative">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={staggerContainer}
                        >
                            <motion.div variants={fadeInUp} className="inline-block px-4 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
                                <span className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                                    <Building2 size={16} />
                                    For Schools & Coaching Institutes
                                </span>
                            </motion.div>

                            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-black text-indigo-950 mb-6 leading-tight">
                                Empower Your Classroom with <span className="text-[#2278B0]">AI Analytics</span>
                            </motion.h2>

                            <motion.p variants={fadeInUp} className="text-lg text-gray-600 mb-8 leading-relaxed">
                                Transform your institution into a data-driven powerhouse. Create custom tests, manage batches, and get student-level AI insights instantly.
                            </motion.p>

                            <motion.div variants={fadeInUp} className="space-y-4 mb-10">
                                <FeatureRoleItem text="Create & Publish Custom Tests in Seconds" />
                                <FeatureRoleItem text="White-labeled Student Dashboard" />
                                <FeatureRoleItem text="Real-time Class Performance Heatmaps" />
                                <FeatureRoleItem text="Automated Grading & Feedback" />
                            </motion.div>

                            <motion.button
                                variants={fadeInUp}
                                onClick={() => navigate('/login?role=institution')} // Redirect to login/signup with intent
                                className="px-8 py-4 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-3 group"
                            >
                                <span>Register Your Institute</span>
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </motion.div>

                        {/* Visual Side */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            {/* Abstract decorative BG */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 to-blue-50 rounded-[3rem] transform rotate-3 scale-95 -z-10" />

                            <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 md:p-8 relative overflow-hidden">
                                {/* Mock UI for Institution Dashboard */}
                                <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                        <Building2 className="text-indigo-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Apex Academy</h3>
                                        <p className="text-xs text-gray-500">Institution Dashboard</p>
                                    </div>
                                    <div className="ml-auto px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full">
                                        Verified
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-gray-500 font-bold uppercase">Active Students</div>
                                            <div className="text-xl font-black text-gray-900">1,248</div>
                                        </div>
                                        <Users className="text-gray-400" />
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-gray-500 font-bold uppercase">Tests Conducted</div>
                                            <div className="text-xl font-black text-gray-900">856</div>
                                        </div>
                                        <BarChart2 className="text-gray-400" />
                                    </div>
                                    <div className="p-4 bg-[#2278B0]/5 rounded-xl border border-[#2278B0]/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap size={16} className="text-[#2278B0]" />
                                            <span className="text-xs font-bold text-[#2278B0]">AI Insight</span>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            "Batch A is struggling with <strong>Modern History</strong>. Recommend scheduling a revision class."
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Badge — centered below the card in normal flow */}
                            <div className="flex justify-center mt-8">
                                <motion.div
                                    className="bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl shadow-indigo-300/40 flex items-center gap-3"
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <div className="font-black text-3xl leading-none">30%</div>
                                    <div className="text-xs font-semibold opacity-90 leading-tight">
                                        Improvement in <br /> Student Scores
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-6 px-6 lg:px-8 bg-white overflow-hidden">
                <motion.div
                    className="max-w-4xl mx-auto"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeInUp} className="text-center mb-16">
                        <div className="inline-block px-4 py-1 rounded-full bg-[#2278B0]/5 border border-[#2278B0]/10 mb-4">
                            <span className="text-sm font-medium text-[#2278B0]">FAQ</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Frequently Asked Questions</h2>
                        <p className="text-lg text-gray-600">
                            Everything you need to know about Evoluter
                        </p>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="space-y-4">
                        <FAQItem
                            question="Is Evoluter really free to use?"
                            answer="Yes! We offer a generous free tier with access to AI test generation, document library, and basic analytics. Premium features are available for advanced users."
                            isOpen={faqOpen === 0}
                            onClick={() => setFaqOpen(faqOpen === 0 ? null : 0)}
                        />
                        <FAQItem
                            question="How does the AI evaluation work?"
                            answer="Our AI is trained on thousands of model answers and UPSC marking schemes. It evaluates your answers on multiple parameters including content accuracy, structure, keyword usage, and depth of analysis."
                            isOpen={faqOpen === 1}
                            onClick={() => setFaqOpen(faqOpen === 1 ? null : 1)}
                        />
                        <FAQItem
                            question="Can I use this for state PSC exams?"
                            answer="Absolutely! While optimized for UPSC, Evoluter supports all major civil services exams including state PSCs. You can customize topics and difficulty levels."
                            isOpen={faqOpen === 2}
                            onClick={() => setFaqOpen(faqOpen === 2 ? null : 2)}
                        />
                        <FAQItem
                            question="How accurate is the AI compared to human evaluation?"
                            answer="Our AI achieves 85-90% correlation with expert evaluations. While it's excellent for practice and identifying areas for improvement, we always recommend cross-verifying critical answers with mentors."
                            isOpen={faqOpen === 3}
                            onClick={() => setFaqOpen(faqOpen === 3 ? null : 3)}
                        />
                        <FAQItem
                            question="Do you offer mobile apps?"
                            answer="Currently Evoluter is a web application optimized for all devices. Native iOS and Android apps are in development and will launch in Q2 2026."
                            isOpen={faqOpen === 4}
                            onClick={() => setFaqOpen(faqOpen === 4 ? null : 4)}
                        />
                        <FAQItem
                            question="How is my data protected?"
                            answer="We take privacy seriously. All data is encrypted, stored securely, and never shared with third parties. You have full control to export or delete your data anytime."
                            isOpen={faqOpen === 5}
                            onClick={() => setFaqOpen(faqOpen === 5 ? null : 5)}
                        />
                    </motion.div>
                </motion.div>
            </section>

            {/* Final CTA Section */}
            <section className="py-6 px-6 lg:px-8 relative overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative rounded-[2.5rem] overflow-hidden bg-indigo-950 px-8 py-16 md:px-16 md:py-24 shadow-2xl"
                    >
                        {/* Mesh Gradient Background */}
                        <div className="absolute inset-0 opacity-40 pointer-events-none">
                            <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[80%] bg-[#2278B0] blur-[120px] rounded-full animate-pulse" />
                            <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[70%] bg-indigo-500 blur-[100px] rounded-full" />
                        </div>

                        <div className="relative z-10 text-center max-w-3xl mx-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium mb-8 backdrop-blur-md"
                            >
                                <Zap className="w-4 h-4 text-[#2278B0] fill-[#2278B0]" />
                                <span>Try the future of learning for free</span>
                            </motion.div>

                            <h2 className="text-4xl md:text-5xl lg:text-7xl font-black mb-8 text-white leading-tight">
                                Stop Guessing. Start <br />
                                Improving with AI.
                            </h2>

                            <p className="text-xl text-white mb-12 max-w-2xl mx-auto leading-relaxed">
                                Join 15,000+ aspirants who are already accelerating their preparation with our state-of-the-art AI ecosystem.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => user ? navigate('/dashboard') : onGetStarted()}
                                    className="w-full sm:w-auto px-10 py-5 bg-[#2278B0] hover:bg-[#1b5f8a] text-white rounded-2xl text-lg font-bold shadow-xl shadow-[#2278B0]/30 transition-all flex items-center justify-center space-x-3 group"
                                >
                                    <span>{user ? "Enter Command Center" : "Get Started with Evoluter"}</span>
                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                </motion.button>

                                <button className="text-white/70 hover:text-white font-medium flex items-center gap-2 transition-colors">
                                    <span>View Roadmap</span>
                                    <ExternalLink size={16} />
                                </button>
                            </div>

                            <div className="mt-12 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 pt-12 border-t border-white/10">
                                <TrustBadge label="UPSC Optimized" />
                                <TrustBadge label="State PSC Support" />
                                <TrustBadge label="24/7 AI Mentor" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 px-6 lg:px-8 relative overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-20">
                        {/* Brand Column */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-10 h-10 bg-indigo-950 rounded-xl flex items-center justify-center shadow-lg">
                                    <Zap size={22} className="text-white fill-white" />
                                </div>
                                <span className="text-2xl font-black text-indigo-950 tracking-tighter">
                                    Evoluter
                                </span>
                            </div>
                            <p className="text-gray-500 mb-8 leading-relaxed max-w-sm">
                                Empowering the next generation of civil servants with cutting-edge AI technology and data-driven learning.
                            </p>
                            <div className="flex space-x-4">
                                <SocialIcon icon={<Twitter size={18} />} />
                                <SocialIcon icon={<Linkedin size={18} />} />
                                <SocialIcon icon={<Github size={18} />} />
                                <SocialIcon icon={<Instagram size={18} />} />
                            </div>
                        </div>

                        {/* Links Columns */}
                        <div>
                            <h4 className="font-bold text-indigo-950 mb-6 uppercase text-xs tracking-widest">Platform</h4>
                            <ul className="space-y-4 text-gray-500 text-sm font-medium">
                                <li><FooterLink href="#features">AI Test Engine</FooterLink></li>
                                <li><FooterLink href="#">Smart Library</FooterLink></li>
                                <li><FooterLink href="#">Mains Grading</FooterLink></li>
                                <li><FooterLink href="#">Pricing</FooterLink></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-indigo-950 mb-6 uppercase text-xs tracking-widest">Company</h4>
                            <ul className="space-y-4 text-gray-500 text-sm font-medium">
                                <li><FooterLink href="/about">About Us</FooterLink></li>
                                <li><FooterLink href="/contact">Contact</FooterLink></li>
                                <li><FooterLink href="#">Resources</FooterLink></li>
                                <li><FooterLink href="#">Careers</FooterLink></li>
                            </ul>
                        </div>

                        {/* Newsletter Column */}
                        <div className="lg:col-span-2">
                            <h4 className="font-bold text-indigo-950 mb-6 uppercase text-xs tracking-widest">Get Updates</h4>
                            <p className="text-sm text-gray-500 mb-6">Stay informed about new features and exam strategies.</p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2278B0]/10 transition-all font-medium"
                                />
                                <button className="p-3 bg-indigo-950 text-white rounded-xl hover:bg-indigo-900 transition-all shadow-lg hover:shadow-indigo-200">
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <p>&copy; 2026 Evoluter Ecosystem. All rights reserved.</p>
                        <div className="flex space-x-8 mt-6 md:mt-0">
                            <FooterLink href="/privacy" isSubtle>Privacy</FooterLink>
                            <FooterLink href="/terms" isSubtle>Terms</FooterLink>
                            <FooterLink href="#" isSubtle>Cookies</FooterLink>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Component: Stat Card
const StatCard = ({ icon, value, label }) => (
    <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        className="bg-gradient-to-br from-white to-[#2278B0]/5 p-6 rounded-2xl border-2 border-[#2278B0]/10 shadow-md hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2278B0]/10 blur-3xl -mr-8 -mt-8 rounded-full group-hover:bg-[#2278B0]/20 transition-colors" />
        <div className="flex justify-center mb-3 relative z-10 scale-110">{icon}</div>
        <div className="text-3xl font-black text-indigo-950 mb-1 relative z-10 tracking-tight">{value}</div>
        <div className="text-xs font-bold text-[#2278B0] uppercase tracking-widest relative z-10">{label}</div>
    </motion.div>
);

// Component: Feature Card
const FeatureCard = ({ icon, title, description }) => (
    <motion.div
        whileHover={{ y: -10, scale: 1.02 }}
        className="bg-gradient-to-br from-white to-indigo-50/30 p-8 rounded-2xl border-2 border-indigo-50 shadow-md hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#2278B0]/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-[#2278B0]/20 transition-colors" />
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#2278B0]/10 flex items-center justify-center mb-6 group-hover:bg-indigo-950 group-hover:border-indigo-950 transition-all duration-300 shadow-sm group-hover:shadow-indigo-200 relative z-10">
            {React.cloneElement(icon, { className: `${icon.props.className} group-hover:text-white transition-colors duration-300` })}
        </div>
        <h3 className="text-2xl font-black mb-3 text-indigo-950 tracking-tight relative z-10">{title}</h3>
        <p className="text-gray-500 font-medium leading-relaxed relative z-10">{description}</p>
    </motion.div>
);

// Component: Value Item
const ValueItem = ({ text }) => (
    <div className="flex items-center space-x-3">
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        <span className="text-gray-700">{text}</span>
    </div>
);

// Component: Process Step
const ProcessStep = ({ number, icon, title, description }) => (
    <div className="relative text-center">
        <motion.div
            whileHover={{ y: -8 }}
            className="bg-gradient-to-tr from-white to-[#2278B0]/5 p-8 rounded-2xl border-2 border-[#2278B0]/5 shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-32 h-32 bg-[#2278B0]/10 blur-3xl -ml-16 -mt-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-gray-400 to-transparent opacity-40 mb-4 group-hover:opacity-40 transition-opacity tracking-tighter">{number}</div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2278B0] to-indigo-950 flex items-center justify-center mb-6 mx-auto shadow-xl shadow-[#2278B0]/20 relative z-10 scale-110">
                {icon}
            </div>
            <h3 className="text-xl font-black mb-3 text-indigo-950 tracking-tight relative z-10">{title}</h3>
            <p className="text-gray-500 font-medium text-sm leading-relaxed relative z-10">{description}</p>
        </motion.div>
    </div>
);

// Component: Testimonial Card
const TestimonialCard = ({ quote, name, achievement, rating }) => (
    <motion.div
        whileHover={{ y: -8 }}
        className="bg-gradient-to-br from-white to-[#2278B0]/5 p-8 rounded-2xl border-2 border-[#2278B0]/5 shadow-md hover:shadow-xl transition-all duration-300 relative group overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#2278B0]/10 blur-3xl -mr-20 -mt-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex space-x-1 mb-6 relative z-10">
            {[...Array(rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-sm" />
            ))}
        </div>
        <p className="text-indigo-950 font-bold italic leading-relaxed relative z-10 mb-8 text-lg">"{quote}"</p>
        <div className="border-t-2 border-[#2278B0]/5 pt-6 relative z-10 flex items-center justify-between">
            <div>
                <div className="font-black text-indigo-950 tracking-tight">{name}</div>
                <div className="text-xs font-black text-[#2278B0] uppercase tracking-widest mt-1">{achievement}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#2278B0]/5 border border-[#2278B0]/10 flex items-center justify-center text-[#2278B0]">
                <Users size={18} />
            </div>
        </div>
    </motion.div>
);

const FeatureRoleItem = ({ text }) => (
    <div className="flex items-center gap-3">
        <div className="p-1 bg-green-100 rounded-full">
            <CheckCircle size={14} className="text-green-600" />
        </div>
        <span className="font-medium text-gray-700">{text}</span>
    </div>
);

// Component: FAQ Item
const FAQItem = ({ question, answer, isOpen, onClick }) => (
    <div className="bg-gradient-to-br from-white to-[#2278B0]/5 rounded-2xl border border-[#2278B0]/5 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <button
            onClick={onClick}
            className="w-full px-6 py-5 flex justify-between items-center hover:bg-[#2278B0]/5 transition-colors text-left group"
        >
            <span className={`font-semibold text-lg transition-colors duration-300 ${isOpen ? 'text-[#2278B0]' : 'text-gray-900'}`}>{question}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-[#2278B0] text-white rotate-90' : 'bg-[#2278B0]/5 text-[#2278B0]'}`}>
                {isOpen ? <Minus size={18} /> : <Plus size={18} />}
            </div>
        </button>
        <motion.div
            initial={false}
            animate={{
                height: isOpen ? 'auto' : 0,
                opacity: isOpen ? 1 : 0
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
        >
            <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-5">
                {answer}
            </div>
        </motion.div>
    </div>
);

// Component: Social Icon
const SocialIcon = ({ icon }) => (
    <a href="#" className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#2278B0] hover:border-[#2278B0]/20 hover:shadow-lg hover:shadow-[#2278B0]/10 transition-all duration-300">
        {icon}
    </a>
);

// Component: Trust Badge
const TrustBadge = ({ label }) => (
    <div className="flex items-center space-x-2 text-white/60">
        <CheckCircle className="w-4 h-4 text-[#2278B0]" />
        <span className="text-sm font-bold uppercase tracking-widest">{label}</span>
    </div>
);

// Component: Footer Link with Hover Animation — uses React Router for routes, scroll for hashes
const FooterLink = ({ href, children, isSubtle }) => {
    const isRoute = href && !href.startsWith('#');
    if (isRoute) {
        return (
            <Link
                to={href}
                className={`relative group inline-block transition-colors duration-300 ${isSubtle ? 'hover:text-indigo-950' : 'hover:text-[#2278B0]'}`}
            >
                <span>{children}</span>
                <span className={`absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${isSubtle ? 'bg-indigo-950' : 'bg-[#2278B0]'}`} />
            </Link>
        );
    }
    return (
        <a
            href={href}
            onClick={(e) => {
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const el = document.getElementById(href.replace('#', ''));
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
            }}
            className={`relative group inline-block transition-colors duration-300 ${isSubtle ? 'hover:text-indigo-950' : 'hover:text-[#2278B0]'}`}
        >
            <span>{children}</span>
            <span className={`absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${isSubtle ? 'bg-indigo-950' : 'bg-[#2278B0]'}`} />
        </a>
    );
};

// Component: Nav Link with Hover and Active State — supports onClick for smart routing
const NavLink = ({ href, children, active, onClick }) => (
    <a
        href={href}
        onClick={onClick ? (e) => onClick(e, href) : undefined}
        className={`relative group text-xs font-bold uppercase tracking-widest transition-colors duration-300 cursor-pointer ${active ? 'text-[#2278B0]' : 'text-gray-500 hover:text-indigo-950'}`}
    >
        <span>{children}</span>
        <span className={`absolute -bottom-1 left-0 h-0.5 bg-[#2278B0] transition-all duration-300 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
    </a>
);

// Component: Analytics Feature
const AnalyticsFeature = ({ icon, title, desc }) => (
    <div className="flex items-start space-x-4">
        <div className="w-10 h-10 rounded-xl bg-[#2278B0]/10 flex items-center justify-center flex-shrink-0 border border-[#2278B0]/20">
            {icon}
        </div>
        <div>
            <div className="text-white font-bold mb-1">{title}</div>
            <div className="text-blue-100/50 text-sm leading-relaxed">{desc}</div>
        </div>
    </div>
);

export default HomeView;
