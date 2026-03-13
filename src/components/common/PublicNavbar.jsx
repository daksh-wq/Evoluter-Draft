
import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo1.png';

const PublicNavbar = ({ user, onLogout, onGetStarted }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

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
        
        // Handle hash links
        if (href.startsWith('#')) {
            if (location.pathname !== '/') {
                navigate('/' + href);
            } else {
                scrollTo(href);
            }
        } 
        // Handle dashboard/login logic
        else if (href === '/dashboard' && !user) {
            navigate('/login');
        } 
        // Handle normal routes
        else {
            navigate(href);
        }
    };

    useEffect(() => {
        if (location.pathname !== '/') return;

        const sections = ['features', 'about', 'how-it-works', 'analytics', 'faq'];
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

        const handleScroll = () => {
            if (window.scrollY < 100) {
                setActiveSection('');
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', handleScroll);
        };
    }, [location.pathname]);

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

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <button
                        onClick={() => {
                            if (location.pathname === '/') {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            } else {
                                navigate('/');
                            }
                        }}
                        className="flex items-center space-x-3 focus:outline-none cursor-pointer"
                    >
                        <div className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden">
                            <img src={logo} alt="Evoluter Logo" className="w-full h-full object-contain" />
                        </div>
                    </button>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <NavLink href="/dashboard" onClick={handleNavClick}>Dashboard</NavLink>
                        <NavLink href="#features" active={activeSection === 'features'} onClick={handleNavClick}>Why Us</NavLink>
                        <NavLink href="#about" active={activeSection === 'about'} onClick={handleNavClick}>About Us</NavLink>
                        <NavLink href="#how-it-works" active={activeSection === 'how-it-works'} onClick={handleNavClick}>How It Works</NavLink>
                        <NavLink href="#analytics" active={activeSection === 'analytics'} onClick={handleNavClick}>Analytics</NavLink>
                        <NavLink href="#faq" active={activeSection === 'faq'} onClick={handleNavClick}>FAQ</NavLink>
                        <NavLink href="/pricing" active={location.pathname === '/pricing'} onClick={handleNavClick}>Pricing</NavLink>
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
                        <a href="/dashboard" onClick={(e) => handleNavClick(e, '/dashboard')} className="block text-gray-500 hover:text-indigo-950 transition-colors text-xs font-bold uppercase tracking-widest">Dashboard</a>
                        <a href="#about" onClick={(e) => handleNavClick(e, '#about')} className="block text-gray-500 hover:text-indigo-950 transition-colors text-xs font-bold uppercase tracking-widest">About Us</a>
                        <a href="#features" onClick={(e) => handleNavClick(e, '#features')} className="block text-gray-500 hover:text-indigo-950 transition-colors text-xs font-bold uppercase tracking-widest">Why Us</a>
                        <a href="/pricing" onClick={(e) => handleNavClick(e, '/pricing')} className={`block transition-colors text-xs font-bold uppercase tracking-widest ${location.pathname === '/pricing' ? 'text-[#2278B0]' : 'text-gray-500 hover:text-indigo-950'}`}>Pricing</a>
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
    );
};

export default PublicNavbar;
