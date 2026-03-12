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


// ─────────────────────────────────────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const INTENTS = {
    STUDY_PLAN: 'STUDY_PLAN',
    QUIZ: 'QUIZ',
    EXPLAIN: 'EXPLAIN',
    ANALYSIS: 'ANALYSIS',
    CURRENT_AFFAIRS: 'CURRENT_AFFAIRS',
    MOTIVATE: 'MOTIVATE',
    GENERAL: 'GENERAL',
};

function detectIntent(text) {
    const t = text.toLowerCase();

    if (/\b(plan|schedule|roadmap|timetable|strategy|routine|week|month|daily plan|study plan|time table)\b/.test(t)) {
        return INTENTS.STUDY_PLAN;
    }
    if (/\b(quiz|test me|question|mock|mcq|practice|ask me|quizme)\b/.test(t)) {
        return INTENTS.QUIZ;
    }
    if (/\b(explain|what is|what are|how does|how do|tell me about|describe|define|meaning of|concept of)\b/.test(t)) {
        return INTENTS.EXPLAIN;
    }
    if (/\b(analyze|analyse|stats|performance|weak|improve|tips|advise|advice|suggest|progress|score)\b/.test(t)) {
        return INTENTS.ANALYSIS;
    }
    if (/\b(news|current affairs|today|recent|latest|update|happening|event)\b/.test(t)) {
        return INTENTS.CURRENT_AFFAIRS;
    }
    if (/\b(motivate|motivation|tired|give up|inspire|demotivated|stressed|burn|struggling|encourage)\b/.test(t)) {
        return INTENTS.MOTIVATE;
    }
    return INTENTS.GENERAL;
}


// ─────────────────────────────────────────────────────────────────────────────
// INTENT-SPECIFIC PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildPrompt(intent, text, userData, userStats) {
    const name = userData?.displayName?.split(' ')[0] || 'Scholar';
    const exam = userData?.targetExam || 'UPSC CSE';
    const level = userStats?.level || 1;
    const xp = userStats?.xp || 0;

    const mastery = userStats?.topicMastery || {};
    const weakSubjects = Object.entries(mastery)
        .filter(([, score]) => score < 50)
        .sort((a, b) => a[1] - b[1])
        .map(([topic, score]) => `${topic} (${score}%)`)
        .join(', ') || 'None detected yet';
    const strongSubjects = Object.entries(mastery)
        .filter(([, score]) => score >= 70)
        .sort((a, b) => b[1] - a[1])
        .map(([topic, score]) => `${topic} (${score}%)`)
        .join(', ') || 'None detected yet';

    const studentContext = `
Student: ${name} | Exam: ${exam} | Level: ${level} | XP: ${xp}
Weak Subjects: ${weakSubjects}
Strong Subjects: ${strongSubjects}
`.trim();

    switch (intent) {
        case INTENTS.STUDY_PLAN:
            return `You are "Evolve Bot", an expert UPSC Mentor.

${studentContext}

The student asked: "${text}"

Create a **personalised weekly study plan** for this student.

STRICT FORMAT RULES:
1. Output a markdown table with columns: | Subject | Days/Week | Hours/Day | Key Focus Areas | Priority |
2. Give weak subjects MORE days/hours than strong subjects.
3. After the table, add a short section "📌 Daily Tips" with 3 bullet points.
4. Keep the whole response under 400 words.
5. Use markdown formatting throughout (bold headers, bullets, table).
6. Do NOT write paragraphs before the table — start directly with the table.`;

        case INTENTS.QUIZ:
            return `You are "Evolve Bot", an expert UPSC MCQ generator.

${studentContext}

The student asked: "${text}"

Generate exactly 1 challenging UPSC-style MCQ relevant to the student's query or their weak subjects if no specific topic is mentioned.

STRICT FORMAT:
**Question:** [Question text here]

**A)** Option A
**B)** Option B
**C)** Option C
**D)** Option D

**✅ Correct Answer:** [Letter] — [Option text]
**💡 Explanation:** [1–2 sentences explaining why]

Do NOT write anything before "**Question:**". Do NOT add a preamble.`;

        case INTENTS.EXPLAIN:
            return `You are "Evolve Bot", an expert UPSC Mentor.

${studentContext}

The student asked: "${text}"

Give a crisp, structured explanation in exactly this format:

**📖 Definition:**
[One clear sentence definition]

**🔑 Key Points:**
- Point 1
- Point 2
- Point 3

**🎯 UPSC Angle / Example:**
[1–2 sentences on why/how this is relevant for ${exam}, or a real-world example]

Keep the entire response under 250 words. Use markdown formatting.`;

        case INTENTS.ANALYSIS:
            return `You are "Evolve Bot", an expert UPSC Performance Coach.

${studentContext}

The student asked: "${text}"

Analyse their performance data and respond with:

**📊 Your Performance Snapshot:**
| Subject | Status | Score |
|---------|--------|-------|
[Fill in subjects from weak/strong data above — mark Weak ⚠️ or Strong ✅]

**🔥 Top 3 Action Items:**
1. [Specific, actionable tip for weakest subject]
2. [Specific, actionable tip for second weak area]
3. [General strategy tip to improve XP/level]

**💬 Coach's Note:** [1 encouraging sentence]

Use markdown. Keep it under 300 words.`;

        case INTENTS.CURRENT_AFFAIRS:
            return `You are "Evolve Bot", a UPSC Current Affairs expert.

${studentContext}

The student asked: "${text}"

Share 4 important, recent current affairs updates relevant to ${exam}.

STRICT FORMAT:
**📰 Current Affairs Flash**

1. **[Topic/Headline]** — [1–2 sentence brief. Tag: *Economy / Polity / Environment / International Relations / Science & Tech*]

2. **[Topic/Headline]** — [brief]

3. **[Topic/Headline]** — [brief]

4. **[Topic/Headline]** — [brief]

Keep each brief to 1–2 sentences. Use markdown.`;

        case INTENTS.MOTIVATE:
            return `You are "Evolve Bot", a warm and powerful motivational mentor.

${studentContext}

The student said: "${text}"

Write a short, powerful motivational message for them. Personalise it with their name (${name}) and acknowledge they are Level ${level} with ${xp} XP — show that their hard work is real.

Keep it to 3–4 sentences max. Use 1–2 emojis. Be genuine, not generic. No lists or headers — just heartfelt prose.`;

        default:
            // GENERAL
            return `Act as "Evolve Bot", a friendly, motivational, and highly intelligent UPSC Mentor.

${studentContext}

User Query: "${text}"

Guidelines:
1. Be concise (max 3–4 sentences unless explanation is needed).
2. Use emojis occasionally (🚀, 💡).
3. If relevant, reference their weak areas from context above.
4. Use markdown formatting if it adds clarity (bold key terms).`;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// MARKDOWN RENDERER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function MarkdownMessage({ text, isUser }) {
    if (!text) return null;

    // Parse markdown into React elements
    const lines = text.split('\n');
    const elements = [];
    let tableBuffer = [];
    let inTable = false;
    let key = 0;

    const flushTable = () => {
        if (tableBuffer.length === 0) return;
        const [headerRow, , ...dataRows] = tableBuffer; // skip separator line
        const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean);
        const rows = dataRows.map(r => r.split('|').map(c => c.trim()).filter(Boolean));

        elements.push(
            <div key={key++} className="overflow-x-auto my-2 rounded-lg border border-white/20 dark-scrollbar">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className={isUser ? 'bg-white/20' : 'bg-[#2278B0]/30'}>
                            {headers.map((h, i) => (
                                <th key={i} className="px-2 py-1.5 text-left font-semibold border-b border-white/20 whitespace-nowrap text-white">
                                    {renderInline(h)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri} className={ri % 2 === 0 ? 'bg-white/5' : 'bg-white/10'}>
                                {row.map((cell, ci) => (
                                    <td key={ci} className="px-2 py-1.5 border-b border-white/10 text-white/90">
                                        {renderInline(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );

        tableBuffer = [];
        inTable = false;
    };

    // Render inline formatting: **bold**, *italic*, `code`
    const renderInline = (str) => {
        if (!str) return null;
        const parts = [];
        let remaining = str;
        let idx = 0;

        while (remaining.length > 0) {
            const boldMatch = remaining.match(/^(.*?)\*\*(.*?)\*\*(.*)/s);
            const italicMatch = remaining.match(/^(.*?)\*(.*?)\*(.*)/s);
            const codeMatch = remaining.match(/^(.*?)`(.*?)`(.*)/s);

            // Pick whichever comes first
            const candidates = [
                boldMatch && { match: boldMatch, type: 'bold', start: boldMatch[1].length },
                italicMatch && { match: italicMatch, type: 'italic', start: italicMatch[1].length },
                codeMatch && { match: codeMatch, type: 'code', start: codeMatch[1].length },
            ].filter(Boolean);

            if (candidates.length === 0) {
                parts.push(<span key={idx++}>{remaining}</span>);
                break;
            }

            // Sort by earliest occurrence
            candidates.sort((a, b) => a.start - b.start);
            const { match, type } = candidates[0];

            if (match[1]) parts.push(<span key={idx++}>{match[1]}</span>);

            if (type === 'bold') parts.push(<strong key={idx++} className="font-semibold text-white">{match[2]}</strong>);
            else if (type === 'italic') parts.push(<em key={idx++} className="text-white/90">{match[2]}</em>);
            else if (type === 'code') parts.push(<code key={idx++} className="bg-black/40 px-1 rounded text-xs font-mono text-blue-200">{match[2]}</code>);

            remaining = match[3];
        }

        return parts;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Table row detection
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            inTable = true;
            tableBuffer.push(line.trim());
            continue;
        } else if (inTable) {
            flushTable();
        }

        // Skip empty lines (but add spacing)
        if (line.trim() === '') {
            elements.push(<div key={key++} className="h-1" />);
            continue;
        }

        // Headings
        if (line.startsWith('### ')) {
            elements.push(<p key={key++} className="font-bold text-sm mt-2 mb-0.5 text-white">{renderInline(line.slice(4))}</p>);
        } else if (line.startsWith('## ')) {
            elements.push(<p key={key++} className="font-bold text-sm mt-2 mb-0.5 text-white">{renderInline(line.slice(3))}</p>);
        } else if (line.startsWith('# ')) {
            elements.push(<p key={key++} className="font-bold text-sm mt-2 mb-0.5 text-white">{renderInline(line.slice(2))}</p>);
        }
        // Bullet / numbered list items
        else if (/^(\s*[-*•]\s)/.test(line)) {
            const content = line.replace(/^\s*[-*•]\s/, '');
            elements.push(
                <div key={key++} className="flex gap-1.5 mt-0.5 text-white/90">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                    <span>{renderInline(content)}</span>
                </div>
            );
        } else if (/^\d+\.\s/.test(line)) {
            const match = line.match(/^(\d+)\.\s(.*)/);
            elements.push(
                <div key={key++} className="flex gap-1.5 mt-0.5 text-white/90">
                    <span className="font-semibold shrink-0 text-white/70">{match[1]}.</span>
                    <span>{renderInline(match[2])}</span>
                </div>
            );
        }
        // Regular paragraph
        else {
            elements.push(<p key={key++} className="leading-relaxed text-white/90">{renderInline(line)}</p>);
        }
    }

    // Flush any remaining table
    if (inTable) flushTable();

    return <div className="space-y-0.5 text-sm">{elements}</div>;
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AI Assistant Bot ("Evolve Bot")
 * Persistent chat widget with intent-aware, structured responses.
 */
const AIAssistant = ({ userData, userStats }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            text: `Hi ${userData?.displayName?.split(' ')[0] || 'Scholar'}! I'm your AI Mentor. Ask me to build a plan, quiz you, explain a topic — or just say hi! 🚀`,
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [model, setModel] = useState('gemini-2.5-flash');
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

    // Close dropdown or chat on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            // If clicking the toggle button, let its onClick handle it
            const toggleButton = document.getElementById('ai-assistant-toggle');
            if (toggleButton && toggleButton.contains(event.target)) {
                return;
            }

            // Handle dropdown click-outside
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowModelMenu(false);
            }

            // Handle chat window click-outside
            const chatBox = document.getElementById('ai-assistant-window');
            if (chatBox && !chatBox.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const suggestions = [
        "Build me a study plan",
        "Quiz me on Polity",
        "Explain Article 21",
        "Motivate me 💪",
    ];

    const handleSend = async (text = input, forceAnalysis = false) => {
        if (!text.trim()) return;

        const userMsg = { id: Date.now(), type: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Detect intent from user message
            const intent = forceAnalysis ? INTENTS.ANALYSIS : detectIntent(text);

            // Build specialised prompt
            const prompt = buildPrompt(intent, text, userData, userStats);

            // Call Gemini
            const responseText = await callGemini(prompt, false, model);

            const botMsg = {
                id: Date.now() + 1,
                type: 'bot',
                text: responseText || "I'm having trouble connecting. Please try again!",
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            logger.error("Bot Error", error);
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'bot',
                text: "Systems overloaded. Please try again later.",
            }]);
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
                id="ai-assistant-toggle"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 bg-[#2278B0]/90 backdrop-blur-md hover:bg-indigo-600/90 text-white p-4 rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 group border border-white/20"
                aria-label="Open AI Assistant"
                title="Open AI Assistant"
            >
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white" />
                <Bot size={28} className="group-hover:rotate-12 transition-transform" />
            </button>
        );
    }

    return (
        <div id="ai-assistant-window" className="fixed bottom-0 sm:bottom-6 right-0 sm:right-6 z-50 w-full sm:w-[390px] h-[85dvh] sm:h-[620px] max-h-[800px] bg-gradient-to-br from-[#1a365d]/95 via-[#2d3748]/95 to-[#4a5568]/95 backdrop-blur-3xl border border-white/20 rounded-t-2xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 fade-in font-sans ring-1 ring-white/10">

            {/* Header */}
            <div className="bg-[#2278B0]/80 backdrop-blur-xl p-4 flex justify-between items-center text-white shrink-0 relative z-20 shadow-lg rounded-t-2xl sm:rounded-t-3xl border-b border-white/10">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-md shadow-inner border border-white/20 hidden sm:block">
                        <GeminiLogo />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm tracking-wide flex items-center gap-2 text-shadow-sm">
                            Evolve AI
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white/90 font-medium tracking-normal border border-white/10">BETA</span>
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] text-blue-100 opacity-90">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            Online • {model === 'gemini-2.5-flash' ? 'Evolve 1.2' : '1.2 Pro'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowModelMenu(!showModelMenu)}
                            className="text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-white/20 backdrop-blur-md shadow-sm"
                        >
                            {model === 'gemini-2.5-flash' ? <Sparkles size={10} className="text-yellow-300" /> : <Cpu size={10} className="text-purple-300" />}
                            {model === 'gemini-2.5-flash' ? '1.2' : 'Pro'}
                            <ChevronDown size={10} />
                        </button>

                        {showModelMenu && (
                            <div className="absolute top-full right-0 mt-3 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right text-slate-800 z-[60]">
                                <div className="p-1 space-y-1">
                                    <button
                                        onClick={() => { setModel('gemini-2.5-flash'); setShowModelMenu(false); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-3 transition-colors ${model === 'gemini-2.5-flash' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <div className={`p-1.5 rounded-md ${model === 'gemini-2.5-flash' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <Sparkles size={14} />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Evolve 1.2</p>
                                            <p className="text-[10px] opacity-70">Fast & Responsive</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => { setModel('gemini-1.5-pro'); setShowModelMenu(false); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-3 transition-colors ${model === 'gemini-1.5-pro' ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100' : 'hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <div className={`p-1.5 rounded-md ${model === 'gemini-1.5-pro' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
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
                        <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm backdrop-blur-md border ${msg.type === 'user'
                            ? 'bg-[#2278B0]/80 border-blue-400/30 text-white rounded-tr-none'
                            : 'bg-white/10 border-white/10 text-white rounded-tl-none'
                            }`}>
                            <MarkdownMessage text={msg.text} isUser={msg.type === 'user'} />
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
            <div className="p-4 bg-white/10 backdrop-blur-xl border-t border-white/10 shrink-0 relative z-20 rounded-b-2xl sm:rounded-b-3xl">

                {/* Suggestions Carousel */}
                {messages.length < 3 && !isTyping && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                        {/* Analyse Stats CTA */}
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
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2278B0]/50 transition-all placeholder:text-white/50 shadow-inner backdrop-blur-md text-white"
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
