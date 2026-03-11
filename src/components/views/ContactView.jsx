import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, User, MessageSquare, Send, CheckCircle, RefreshCw } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import logger from '../../utils/logger';
import { handleError, ErrorSeverity, ErrorCategory } from '../../utils/errorHandler';

/**
 * ContactView Component
 * Contact form with Firestore submission
 */
const ContactView = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Client-side sanitization
        const sanitized = {
            name: formData.name.trim().substring(0, 100),
            email: formData.email.trim().toLowerCase().substring(0, 254),
            subject: formData.subject.trim().substring(0, 200),
            message: formData.message.trim().substring(0, 5000),
        };

        // Validate non-empty after trim
        if (!sanitized.name || !sanitized.email || !sanitized.subject || !sanitized.message) {
            handleError(
                new Error('Validation failed'),
                'Please fill out all fields before submitting.',
                ErrorSeverity.USER_FACING,
                ErrorCategory.VALIDATION
            );
            return;
        }

        setSubmitting(true);

        try {
            await addDoc(collection(db, 'contact_submissions'), {
                ...sanitized,
                submittedAt: serverTimestamp(),
                status: 'new'
            });
            setSubmitted(true);
            logger.info('Contact form submitted', { email: sanitized.email });
        } catch (error) {
            handleError(error, 'Failed to submit. Please try again.', ErrorSeverity.USER_FACING, ErrorCategory.DATABASE);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-[#2278B0]/5 font-sans text-slate-800">
            <div className="max-w-5xl mx-auto px-6 py-6">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors">
                    <ArrowLeft size={16} /> Back to Home
                </Link>
            </div>

            <div className="max-w-2xl mx-auto px-6 pb-20">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-slate-900 mb-3">Contact Us</h1>
                    <p className="text-slate-500">Have a question or feedback? We'd love to hear from you.</p>
                </div>

                {!submitted ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Your name"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2278B0] focus:ring-2 focus:ring-[#2278B0]/20 font-medium text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="you@example.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2278B0] focus:ring-2 focus:ring-[#2278B0]/20 font-medium text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Subject</label>
                                <div className="relative">
                                    <MessageSquare size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                        placeholder="What's this about?"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2278B0] focus:ring-2 focus:ring-[#2278B0]/20 font-medium text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Message</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows={5}
                                    placeholder="Tell us more..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2278B0] focus:ring-2 focus:ring-[#2278B0]/20 font-medium text-sm resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <RefreshCw size={18} className="animate-spin" />
                                ) : (
                                    <>Send Message <Send size={18} /></>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Message Sent!</h2>
                        <p className="text-slate-500 mb-6">
                            Thank you for reaching out. We'll get back to you within 24 hours.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 bg-indigo-950 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-900 transition-all"
                        >
                            <ArrowLeft size={18} /> Back to Home
                        </Link>
                    </div>
                )}

                {/* Contact Info */}
                <div className="mt-8 text-center text-sm text-slate-500">
                    <p>You can also reach us at <a href="mailto:support@evoluter.in" className="text-[#2278B0] font-bold hover:underline">support@evoluter.in</a></p>
                </div>
            </div>
        </div>
    );
};

export default ContactView;
