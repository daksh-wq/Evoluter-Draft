import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Target, Users, Lightbulb, Rocket, Heart } from 'lucide-react';

/**
 * AboutView Component
 * Company information, team vision, and mission
 */
const AboutView = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-[#2278B0]/5 font-sans text-slate-800">
            {/* Navigation */}
            <div className="max-w-5xl mx-auto px-6 py-6">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors">
                    <ArrowLeft size={16} /> Back to Home
                </Link>
            </div>

            <div className="max-w-5xl mx-auto px-6 pb-20">
                {/* Hero */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">About Evoluter</h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        Empowering aspirants with AI-driven intelligence to conquer competitive exams
                    </p>
                </div>

                {/* Mission & Vision */}
                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 bg-[#2278B0]/10 rounded-xl flex items-center justify-center mb-4">
                            <Target size={24} className="text-[#2278B0]" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Our Mission</h2>
                        <p className="text-slate-600 leading-relaxed">
                            To democratize quality exam preparation by leveraging artificial intelligence,
                            making world-class study tools accessible to every aspirant regardless of their
                            background or location.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                            <Lightbulb size={24} className="text-purple-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Our Vision</h2>
                        <p className="text-slate-600 leading-relaxed">
                            To become the most trusted AI-powered exam ecosystem that identifies knowledge gaps,
                            personalizes learning paths, and transforms how students prepare for competitive exams.
                        </p>
                    </div>
                </div>

                {/* Values */}
                <h2 className="text-3xl font-bold text-slate-900 text-center mb-8">What We Believe</h2>
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {[
                        {
                            icon: <Rocket size={24} className="text-orange-500" />,
                            title: 'Innovation First',
                            desc: 'We use cutting-edge AI to create personalized, adaptive learning experiences.'
                        },
                        {
                            icon: <Users size={24} className="text-green-500" />,
                            title: 'Student-Centric',
                            desc: 'Every feature is designed with the aspirant in mind — their goals, challenges, and timelines.'
                        },
                        {
                            icon: <Heart size={24} className="text-red-500" />,
                            title: 'Equal Access',
                            desc: 'Quality education should be accessible to all. We strive to bridge the resource gap.'
                        }
                    ].map((value, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                                {value.icon}
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">{value.title}</h3>
                            <p className="text-slate-500 text-sm">{value.desc}</p>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="bg-indigo-950 text-white rounded-2xl p-10 text-center">
                    <h2 className="text-2xl font-bold mb-3">Ready to Start Your Journey?</h2>
                    <p className="text-blue-200 mb-6">Join thousands of aspirants already using Evoluter to ace their exams.</p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 bg-white text-indigo-950 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all"
                    >
                        Get Started Free <Rocket size={18} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AboutView;
