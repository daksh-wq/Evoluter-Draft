import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

/**
 * PrivacyView Component
 * Privacy Policy page
 */
const PrivacyView = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-800">
            <div className="max-w-3xl mx-auto px-6 py-6">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors">
                    <ArrowLeft size={16} /> Back to Home
                </Link>
            </div>

            <div className="max-w-3xl mx-auto px-6 pb-20">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-[#2278B0]/10 rounded-xl flex items-center justify-center">
                        <Shield size={24} className="text-[#2278B0]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Privacy Policy</h1>
                        <p className="text-sm text-slate-500">Last updated: February 2026</p>
                    </div>
                </div>

                <div className="prose prose-slate max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
                        <p className="text-slate-600 leading-relaxed mb-3">When you use Evoluter, we collect information you provide directly:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-600">
                            <li>Account information (name, email address)</li>
                            <li>Profile information (target exam, preparation year)</li>
                            <li>Test responses and performance data</li>
                            <li>Documents you upload to the library</li>
                            <li>Contact form submissions</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
                        <p className="text-slate-600 leading-relaxed mb-3">We use collected information to:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-600">
                            <li>Provide and improve our exam preparation services</li>
                            <li>Generate AI-powered test questions personalized to your needs</li>
                            <li>Track your progress and provide performance analytics</li>
                            <li>Communicate with you about your account and updates</li>
                            <li>Ensure the security and integrity of our platform</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">3. Data Storage & Security</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Your data is stored securely using Google Firebase infrastructure with industry-standard
                            encryption. We implement appropriate technical and organizational measures to protect
                            your personal information against unauthorized access, alteration, or destruction.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">4. Third-Party Services</h2>
                        <p className="text-slate-600 leading-relaxed mb-3">We use the following third-party services:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-600">
                            <li><strong>Google Firebase</strong> — Authentication, database, and file storage</li>
                            <li><strong>Google Gemini AI</strong> — Question generation and performance analysis</li>
                            <li><strong>Google Analytics</strong> — Usage analytics and performance monitoring</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">5. Your Rights</h2>
                        <p className="text-slate-600 leading-relaxed mb-3">You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-600">
                            <li>Access your personal data</li>
                            <li>Request correction or deletion of your data</li>
                            <li>Export your data in a portable format</li>
                            <li>Withdraw consent for data processing</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">6. Contact</h2>
                        <p className="text-slate-600 leading-relaxed">
                            For privacy-related questions, contact us at{' '}
                            <a href="mailto:privacy@evoluter.in" className="text-[#2278B0] font-bold hover:underline">
                                privacy@evoluter.in
                            </a>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyView;
