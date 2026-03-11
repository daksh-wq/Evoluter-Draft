import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, User, ChevronDown, Minimize2, BarChart2, Cpu } from 'lucide-react';
import { callGemini } from '../../services/geminiService';
import logger from '../../utils/logger';

// Gemini Logo SVG
const GeminiLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
        <path d="M12.8728 1.93333C12.5905 1.77778 12.2461 1.77778 11.9638 1.93333C9.43444 3.32635 7.1691 5.37877 5.43353 7.82255C3.39893 10.6876 2.08333 13.9878 1.66667 17.5111C1.61869 17.9167 1.97906 18.2505 2.38542 18.2505C4.24219 18.2505 6.04688 18.8073 7.57812 19.8229C8.98958 20.759 10.1354 22.0163 10.9323 23.4862C11.1276 23.8465 11.6432 23.8465 11.8385 23.4862C12.6354 22.0163 13.7812 20.759 15.1927 19.8229C16.724 18.8073 18.5286 18.2505 20.3854 18.2505C20.7918 18.2505 21.1521 17.9167 21.1042 17.5111C20.6875 13.9878 19.3719 10.6876 17.3373 7.82255C15.6017 5.37877 13.3364 3.32635 10.807 1.93333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 5.5V18.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Blue Version for Avatar
const GeminiLogoBlue = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
        <path d="M12.8728 1.93333C12.5905 1.77778 12.2461 1.77778 11.9638 1.93333C9.43444 3.32635 7.1691 5.37877 5.43353 7.82255C3.39893 10.6876 2.08333 13.9878 1.66667 17.5111C1.61869 17.9167 1.97906 18.2505 2.38542 18.2505C4.24219 18.2505 6.04688 18.8073 7.57812 19.8229C8.98958 20.759 10.1354 22.0163 10.9323 23.4862C11.1276 23.8465 11.6432 23.8465 11.8385 23.4862C12.6354 22.0163 13.7812 20.759 15.1927 19.8229C16.724 18.8073 18.5286 18.2505 20.3854 18.2505C20.7918 18.2505 21.1521 17.9167 21.1042 17.5111C20.6875 13.9878 19.3719 10.6876 17.3373 7.82255C15.6017 5.37877 13.3364 3.32635 10.807 1.93333" stroke="url(#paint0_linear)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 5.5V18.5" stroke="url(#paint1_linear)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
            <linearGradient id="paint0_linear" x1="11.375" y1="1.75" x2="11.375" y2="23.75" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4CA1F3" />
                <stop offset="1" stopColor="#9A66FF" />
            </linearGradient>
            <linearGradient id="paint1_linear" x1="12" y1="5.5" x2="12" y2="18.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4CA1F3" />
                <stop offset="1" stopColor="#9A66FF" />
            </linearGradient>
        </defs>
    </svg>
);

/**
 * AI Assistant Bot ("Evolve Bot")
 * Persistent chat widget for personalized student assistance
 */
const AIAssistant = ({ userData, userStats }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            text: `Hi ${userData?.displayName?.split(' ')[0] || 'Scholar'}! I'm your specific AI Mentor. How can I help you evolve today?`
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [model, setModel] = useState('gemini-2.5-flash'); // 'gemini-2.5-flash' | 'gemini-1.5-pro'
    const [showModelMenu, setShowModelMenu] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowModelMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const suggestions = [
        "Give me a study plan",
        "Quiz me on Polity",
        "Explain Article 21"
    ];

    const handleSend = async (text = input, isAnalysis = false) => {
        if (!text.trim()) return;

        // Add User Message
        const userMsg = { id: Date.now(), type: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Construct Contextual Prompt
            let contextPrompt = `
            Act as "Evolve Bot", a friendly, motivational, and highly intelligent UPSC Mentor.
            
            User Context:
            - Name: ${userData?.displayName || 'Student'}
            - Target Exam: ${userData?.targetExam || 'UPSC CSE'}
            - Current Level: ${userStats?.level || 1}
            - XP: ${userStats?.xp || 0}
            - Weak Areas: ${Object.entries(userStats?.topicMastery || {})
                    .filter(([, score]) => score < 50)
                    .map(([topic]) => topic)
                    .join(', ') || 'None detected yet'}
            
            User Query: "${text}"
            
            Guidelines:
            1. Be concise (max 3-4 sentences unless asked for an explanation).
            2. Use emojis occasionally (🚀, 💡).
            3. If asked about weak areas, use the data provided above.
            4. If asked for a quiz, generate one hard question.
            `;

            if (isAnalysis) {
                contextPrompt += `\nSPECIAL INSTRUCTION: Analyze the user's stats above. Give 3 specific, actionable tips to improve their weak areas or boost their XP. be encouraging.`;
            }

            // Call AI with selected model
            const responseText = await callGemini(contextPrompt, false, model);

            // Add Bot Message
            const botMsg = {
                id: Date.now() + 1,
                type: 'bot',
                text: responseText || "I'm having trouble connecting to the neural network. Try again?"
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            logger.error("Bot Error", error);
            setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: "Systems overloaded. Please try again later." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 bg-[#2278B0]/90 backdrop-blur-md hover:bg-indigo-600/90 text-white p-4 rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 group border border-white/20"
                aria-label="Open AI Assistant"
            >
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white" />
                <Bot size={28} className="group-hover:rotate-12 transition-transform" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 fade-in font-sans ring-1 ring-white/10">
            {/* Header */}
            <div className="bg-[#2278B0]/80 backdrop-blur-xl p-4 flex justify-between items-center text-white shrink-0 relative z-20 shadow-lg rounded-t-3xl border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-md shadow-inner border border-white/20">
                        <GeminiLogo />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm tracking-wide flex items-center gap-2 text-shadow-sm">
                            Evolve AI
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white/90 font-medium tracking-normal border border-white/10">BETA</span>
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] text-blue-100 opacity-90">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse box-shadow-green" />
                            Online • {model === 'gemini-2.5-flash' ? 'Evolve 1.2' : '1.2 Pro'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowModelMenu(!showModelMenu)}
                            className="text-[10px] font-bold bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-white/10 backdrop-blur-sm"
                        >
                            {model === 'gemini-2.5-flash' ? <Sparkles size={10} className="text-yellow-300" /> : <Cpu size={10} className="text-purple-300" />}
                            {model === 'gemini-2.5-flash' ? '1.2' : 'Pro'}
                            <ChevronDown size={10} />
                        </button>

                        {/* Model Dropdown */}
                        {showModelMenu && (
                            <div className="absolute top-full right-0 mt-3 w-48 bg-white/60 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/40 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right text-slate-800 ring-1 ring-black/5 z-50">
                                <div className="p-1 space-y-1">
                                    <button
                                        onClick={() => { setModel('gemini-2.5-flash'); setShowModelMenu(false); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-3 transition-colors ${model === 'gemini-2.5-flash' ? 'bg-blue-50/50 text-blue-700' : 'hover:bg-white/40 text-slate-600'}`}
                                    >
                                        <div className={`p-1.5 rounded-md ${model === 'gemini-2.5-flash' ? 'bg-blue-100/80 text-blue-600' : 'bg-slate-100/50 text-slate-500'}`}>
                                            <Sparkles size={14} />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Evolve 1.2</p>
                                            <p className="text-[10px] opacity-70">Fast & Responsive</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => { setModel('gemini-1.5-pro'); setShowModelMenu(false); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-3 transition-colors ${model === 'gemini-1.5-pro' ? 'bg-purple-50/50 text-purple-700' : 'hover:bg-white/40 text-slate-600'}`}
                                    >
                                        <div className={`p-1.5 rounded-md ${model === 'gemini-1.5-pro' ? 'bg-purple-100/80 text-purple-600' : 'bg-slate-100/50 text-slate-500'}`}>
                                            <Cpu size={14} />
                                        </div>
                                        <div>
                                            <p className="font-semibold">1.2 Pro</p>
                                            <p className="text-[10px] opacity-70">Deep Reasoning</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
                    >
                        <Minimize2 size={18} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide relative z-10">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-lg ${msg.type === 'user' ? 'bg-slate-400/90' : 'bg-[#2278B0]/90'} backdrop-blur-sm border border-white/20`}>
                            {msg.type === 'user' ? <User size={14} /> : <div className="p-1.5"><GeminiLogoBlue /></div>}
                        </div>

                        {/* Bubble */}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm backdrop-blur-md border ${msg.type === 'user'
                            ? 'bg-[#2278B0]/80 border-blue-400/30 text-white rounded-tr-none'
                            : 'bg-white/20 border-white/20 text-slate-800 rounded-tl-none'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-md border border-slate-100/50 backdrop-blur-sm">
                            <div className="p-1.5"><GeminiLogoBlue /></div>
                        </div>
                        <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex gap-1 items-center">
                            <div className="w-2 h-2 bg-slate-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-slate-500/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-slate-500/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions & Input */}
            <div className="p-4 bg-white/10 backdrop-blur-xl border-t border-white/10 shrink-0 relative z-20 rounded-b-3xl">
                {/* Suggestions Carousel */}
                {messages.length < 3 && !isTyping && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                        {/* Context Action */}
                        <button
                            onClick={() => handleSend("Analyze my dashboard stats and give me advice.", true)}
                            className="whitespace-nowrap px-3 py-1.5 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200/50 transition-colors flex items-center gap-1 shadow-sm backdrop-blur-md"
                        >
                            <BarChart2 size={12} /> Analyze Stats
                        </button>

                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(s)}
                                className="whitespace-nowrap px-3 py-1.5 bg-white/20 hover:bg-white/40 text-slate-700 hover:text-[#2278B0] text-xs font-medium rounded-full border border-white/20 hover:border-white/40 transition-all shadow-sm backdrop-blur-md"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Field */}
                <div className="relative flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyUp={handleKeyPress}
                        placeholder="Ask Evolve Bot..."
                        className="flex-1 bg-white/20 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2278B0]/30 focus:border-[#2278B0]/50 transition-all placeholder:text-slate-500 shadow-inner backdrop-blur-md text-slate-800"
                        disabled={isTyping}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isTyping}
                        className="p-3 bg-[#2278B0]/80 text-white rounded-xl hover:bg-[#2278B0] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95 hover:translate-y-[-1px] backdrop-blur-md border border-white/10"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;
