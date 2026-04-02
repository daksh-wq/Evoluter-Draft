/**
 * Question Bank Admin View
 *
 * Provides admin interface to:
 * - Browse, filter and search the question_bank Firestore collection
 * - View the decoded 16-char question tag ID and Approach Brief per question
 * - Manually add questions with full tag selection
 * - Trigger AI Approach Brief generation for any question
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    collection, getDocs, query, where,
    orderBy, limit, addDoc, doc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../services/firebase';
import {
    SUBJECT_CODES, TOPIC_CODES, SOURCE_CODES, QUESTION_TYPE_CODES,
    DIFFICULTY_CODES, PYQ_CODES, SUBJECTS,
    SUBJECT_CODE_TO_NAME, QUESTION_TYPE_CODE_TO_NAME, DIFFICULTY_CODE_TO_NAME,
} from '../../../constants/appConstants';
import { decodeQuestionId, generateQuestionId, getSubjectSources } from '../../../utils/questionTagUtils';
import { toast } from '../../../utils/toast';
import {
    Search, Filter, Plus, ChevronDown, ChevronUp,
    BookOpen, Tag, Sparkles, X, Loader, Eye, RefreshCw,
    Edit2, Save, Trash2, CheckCircle2, Hash, Bookmark, Clock
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
    subject: 'Polity & Constitution', topicCode: '01',
    sourceCode: 'SN', typeCode: 'DF', difficultyCode: 'ME', pyqCode: 'NA',
    text: '', options: ['', '', '', ''], correctAnswer: 0,
    correctAnswerReason: '', approachToSolve: '', sourceOfQuestion: ''
};

// ─── Visual Design Tokens ─────────────────────────────────────────────────────
const SUBJECT_COLORS = {
    PC: { bg: '#ede9fe', text: '#6d28d9', bar: '#7c3aed' },
    IE: { bg: '#ecfdf5', text: '#047857', bar: '#10b981' },
    GE: { bg: '#f0fdfa', text: '#0f766e', bar: '#14b8a6' },
    ST: { bg: '#ecfeff', text: '#0e7490', bar: '#06b6d4' },
    IR: { bg: '#eff6ff', text: '#1d4ed8', bar: '#3b82f6' },
    AC: { bg: '#fdf2f8', text: '#be185d', bar: '#ec4899' },
    EN: { bg: '#ecfdf5', text: '#047857', bar: '#34d399' },
    AM: { bg: '#fffbeb', text: '#b45309', bar: '#f59e0b' },
    MO: { bg: '#fff7ed', text: '#c2410c', bar: '#f97316' },
    MX: { bg: '#f8fafc', text: '#475569', bar: '#94a3b8' },
};
const DIFF_BAR_COLORS = {
    ET: '#ef4444', TO: '#f97316', ME: '#eab308', ES: '#22c55e', FO: '#14b8a6',
};
const DIFF_LABELS = {
    ET: 'Extreme', TO: 'Tough', ME: 'Medium', ES: 'Easy', FO: 'Foundation',
};
const TYPE_LABELS = {
    DF: 'Direct Factual', MS: 'Multi-Statement', PB: 'Pair-Based',
    SR: 'Assertion-Reason', DE: 'Definitional', HM: 'How Many', AB: 'Application',
    FA: 'Factual', CO: 'Conceptual', IN: 'Informative',
};

const DifficultyPill = ({ code }) => {
    const bg = { ET: 'bg-red-500', TO: 'bg-orange-500', ME: 'bg-yellow-500', ES: 'bg-green-500', FO: 'bg-teal-500' };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold text-white ${bg[code] || 'bg-slate-400'}`}>
            {DIFF_LABELS[code] || code}
        </span>
    );
};

const TypePill = ({ code }) => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
        {TYPE_LABELS[code] || code}
    </span>
);

const SubjectPill = ({ code }) => {
    const c = SUBJECT_COLORS[code] || SUBJECT_COLORS.MX;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>
            {SUBJECT_CODE_TO_NAME[code] || code}
        </span>
    );
};

// ─── Question ID Display (Compact) ───────────────────────────────────────────
const QuestionIdDisplay = ({ questionId }) => {
    if (!questionId) return null;
    const serial = questionId.split('-').pop();
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-500">
            <Hash size={9} />{serial ? `#${serial}` : questionId.slice(-6)}
        </span>
    );
};

// ─── Approach Brief Panel ─────────────────────────────────────────────────────
const ApproachBriefPanel = ({ brief, decoded }) => {
    if (!brief && !decoded) return null;
    const { typeStatement, sourceStatement, difficultyAdvice } = (() => {
        const DIFF_ADV = {
            ET: 'Extreme Tough — avoid unless well-prepared.',
            TO: 'Tough — attempt only if confident.',
            ME: 'Medium — attempt; a prepared student should not skip this.',
            ES: 'Easy — must be attempted; skipping is a mistake.',
            FO: 'Foundational — must be attempted; tests basic concepts.',
        };
        return {
            typeStatement: `This is a ${decoded?.typeName || '—'} type question.`,
            sourceStatement: `It is from a ${decoded?.sourceName || '—'} source.`,
            difficultyAdvice: DIFF_ADV[decoded?.difficultyCode] || '—',
        };
    })();

    return (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3 text-sm">
            <h4 className="font-bold text-[#124263] text-xs uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={13} /> Approach Brief
            </h4>
            <div className="space-y-2">
                {[typeStatement, sourceStatement, difficultyAdvice].map((s, i) => (
                    <p key={i} className="text-slate-700 flex gap-2">
                        <span className="text-indigo-400 font-bold">{i + 1}.</span> {s}
                    </p>
                ))}
                {brief?.howToSolve && (
                    <p className="text-slate-700 flex gap-2">
                        <span className="text-indigo-400 font-bold">4.</span> {brief.howToSolve}
                    </p>
                )}
                {brief?.topicContext && (
                    <div className="bg-white border border-indigo-100 rounded-lg p-3 text-slate-600 italic text-xs leading-relaxed">
                        {brief.topicContext}
                    </div>
                )}
                {brief?.relatedQuestions?.length > 0 && (
                    <div>
                        <p className="text-[11px] font-bold text-[#1b5f8a] uppercase tracking-wider mb-1">Related Questions</p>
                        <ul className="space-y-1">
                            {brief.relatedQuestions.map((q, i) => (
                                <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-indigo-300">›</span>{q}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {brief?.furtherReading?.length > 0 && (
                    <div>
                        <p className="text-[11px] font-bold text-[#1b5f8a] uppercase tracking-wider mb-1">Further Reading</p>
                        <ul className="space-y-1">
                            {brief.furtherReading.map((r, i) => (
                                <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-indigo-300">›</span>{r}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Question Row (Redesigned) ────────────────────────────────────────────────
const QuestionRow = ({ q, index, onUpdated }) => {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [generatingBrief, setGeneratingBrief] = useState(false);
    const [brief, setBrief] = useState(q.approachBrief || null);
    const decoded = q.questionId ? decodeQuestionId(q.questionId) : null;

    // Editable state
    const [editText, setEditText] = useState(q.text || '');
    const [editOptions, setEditOptions] = useState([...(q.options || ['', '', '', ''])]);
    const [editCorrect, setEditCorrect] = useState(q.correctAnswer || 0);
    const [editReason, setEditReason] = useState(q.solution?.correctAnswerReason || '');
    const [editSource, setEditSource] = useState(q.solution?.sourceOfQuestion || '');
    const [editApproach, setEditApproach] = useState(q.solution?.approachToSolve || '');
    const [editSubjectCode, setEditSubjectCode] = useState(q.subjectCode || 'PC');
    const [editTopicCode, setEditTopicCode] = useState(q.topicCode || '01');
    const [editSourceCode, setEditSourceCode] = useState(q.sourceCode || 'SN');
    const [editTypeCode, setEditTypeCode] = useState(q.typeCode || 'DF');
    const [editDiffCode, setEditDiffCode] = useState(q.difficultyCode || 'ME');
    const [editPyqCode, setEditPyqCode] = useState(q.pyqCode || 'NA');

    const editTopicMap = TOPIC_CODES[editSubjectCode] || {};
    const sc = SUBJECT_COLORS[q.subjectCode] || SUBJECT_COLORS.MX;
    const diffColor = DIFF_BAR_COLORS[q.difficultyCode] || '#94a3b8';

    const handleStartEdit = () => {
        setEditText(q.text || '');
        setEditOptions([...(q.options || ['', '', '', ''])]);
        setEditCorrect(q.correctAnswer || 0);
        setEditReason(q.solution?.correctAnswerReason || '');
        setEditSource(q.solution?.sourceOfQuestion || '');
        setEditApproach(q.solution?.approachToSolve || '');
        setEditSubjectCode(q.subjectCode || 'PC');
        setEditTopicCode(q.topicCode || '01');
        setEditSourceCode(q.sourceCode || 'SN');
        setEditTypeCode(q.typeCode || 'DF');
        setEditDiffCode(q.difficultyCode || 'ME');
        setEditPyqCode(q.pyqCode || 'NA');
        setEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!editText.trim()) { toast.error('Question text is required'); return; }
        setSaving(true);
        try {
            const newId = generateQuestionId(editSubjectCode, editTopicCode, editSourceCode, editTypeCode, editDiffCode, editPyqCode, 0);
            const realId = newId.replace('-0000', q.questionId?.split('-').pop() ? `-${q.questionId.split('-').pop()}` : `-E${String(Date.now()).slice(-4)}`);
            await updateDoc(doc(db, 'question_bank', q.id), {
                questionId: realId, subjectCode: editSubjectCode, topicCode: editTopicCode,
                sourceCode: editSourceCode, typeCode: editTypeCode, difficultyCode: editDiffCode, pyqCode: editPyqCode,
                text: editText.trim(), options: editOptions.map(o => o.trim()), correctAnswer: editCorrect,
                solution: { correctAnswerReason: editReason.trim(), sourceOfQuestion: editSource.trim(), approachToSolve: editApproach.trim() },
                updatedAt: serverTimestamp(),
            });
            toast.success('Question updated!'); setEditing(false);
            if (onUpdated) onUpdated();
        } catch (err) { console.error(err); toast.error('Failed to update question'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this question permanently?')) return;
        setDeleting(true);
        try { await deleteDoc(doc(db, 'question_bank', q.id)); toast.success('Question deleted'); if (onUpdated) onUpdated(); }
        catch (err) { console.error(err); toast.error('Failed to delete'); }
        finally { setDeleting(false); }
    };

    const handleGenerateBrief = async () => {
        setGeneratingBrief(true);
        try {
            const fn = httpsCallable(functions, 'generateApproachBrief');
            const result = await fn({ questionId: q.questionId, questionText: q.text });
            setBrief(result.data.approachBrief); toast.success('Brief generated!');
        } catch (err) { console.error(err); toast.error('Failed to generate brief'); }
        finally { setGeneratingBrief(false); }
    };

    const setEditOption = (i, v) => { const opts = [...editOptions]; opts[i] = v; setEditOptions(opts); };

    return (
        <div className="group rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
            {/* ─── Collapsed Summary ─────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
                {/* Number */}
                <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold" style={{ background: sc.bg, color: sc.text }}>
                    {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-800 font-medium leading-snug line-clamp-1">{q.text}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <SubjectPill code={q.subjectCode} />
                        <TypePill code={q.typeCode} />
                        <DifficultyPill code={q.difficultyCode} />
                        {q.source === 'student-dashboard' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 text-[9px] font-bold">AI</span>
                        )}
                    </div>
                </div>

                {/* Expand Arrow */}
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${open ? 'bg-[#2278B0] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </div>

            {/* ─── Expanded Detail ──────────────────────────── */}
            {open && (
                <div className="border-t border-slate-100">
                    {/* Action Toolbar */}
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50/70 border-b border-slate-100">
                        {!editing ? (
                            <>
                                <button onClick={handleStartEdit}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 hover:bg-amber-100 transition-colors">
                                    <Edit2 size={11} /> Edit
                                </button>
                                <button onClick={handleDelete} disabled={deleting}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold text-red-600 bg-red-50 border border-red-200/70 hover:bg-red-100 transition-colors disabled:opacity-50">
                                    {deleting ? <Loader size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                                <div className="flex-1" />
                                {!brief ? (
                                    <button onClick={handleGenerateBrief} disabled={generatingBrief}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold text-[#2278B0] bg-blue-50 border border-blue-200/70 hover:bg-blue-100 transition-colors disabled:opacity-50">
                                        {generatingBrief ? <Loader size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                        {generatingBrief ? 'Generating...' : 'Gen Brief'}
                                    </button>
                                ) : (
                                    <button onClick={handleGenerateBrief} disabled={generatingBrief}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-500 hover:text-[#2278B0] transition-colors disabled:opacity-50">
                                        <RefreshCw size={10} className={generatingBrief ? 'animate-spin' : ''} /> Regen
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <button onClick={handleSaveEdit} disabled={saving}
                                    className="inline-flex items-center gap-1.5 px-4 py-1 rounded-md text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50">
                                    {saving ? <Loader size={11} className="animate-spin" /> : <Save size={11} />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button onClick={() => setEditing(false)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                                    <X size={11} /> Cancel
                                </button>
                            </>
                        )}
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Question Text */}
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Question</p>
                            {editing ? (
                                <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-[#2278B0]/40 focus:border-[#2278B0] outline-none resize-none" />
                            ) : (
                                <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap">{q.text}</p>
                            )}
                        </div>

                        {/* Options */}
                        {editing ? (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Options (select correct)</p>
                                {editOptions.map((opt, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <input type="radio" name={`edit-correct-${q.id}`} checked={editCorrect === i}
                                            onChange={() => setEditCorrect(i)} className="accent-green-600 w-4 h-4 shrink-0" />
                                        <span className="text-sm font-bold text-slate-400 w-5">{String.fromCharCode(65 + i)}.</span>
                                        <input type="text" value={opt} onChange={e => setEditOption(i, e.target.value)}
                                            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#2278B0]/40 focus:border-[#2278B0] outline-none" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options?.map((opt, i) => (
                                    <div key={i}
                                        className={`flex items-start gap-2 text-[13px] px-3 py-2.5 rounded-xl border transition-all ${
                                            i === q.correctAnswer
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50'
                                        }`}>
                                        {i === q.correctAnswer && <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />}
                                        <span>
                                            <span className="font-bold text-slate-400 mr-1.5">{String.fromCharCode(65 + i)}.</span>
                                            <span className={i === q.correctAnswer ? 'font-semibold' : ''}>{opt}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tag Grid */}
                        {editing ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</label>
                                    <select value={editSubjectCode} onChange={e => { setEditSubjectCode(e.target.value); setEditTopicCode('01'); }}
                                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0]/40 outline-none">
                                        {Object.entries(SUBJECT_CODES).filter(([n]) => n !== 'All Subjects').map(([name, code]) => (
                                            <option key={code} value={code}>{code} — {name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sub Topic</label>
                                    <select value={editTopicCode} onChange={e => setEditTopicCode(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0]/40 outline-none">
                                        {Object.keys(editTopicMap).length > 0 ? (
                                            Object.entries(editTopicMap).map(([code, name]) => (
                                                <option key={code} value={code}>{code} — {name}</option>
                                            ))
                                        ) : (
                                            <option value="01">01 — General</option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Source</label>
                                    <select value={editSourceCode} onChange={e => setEditSourceCode(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0]/40 outline-none">
                                        {Object.entries(SOURCE_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Type</label>
                                    <select value={editTypeCode} onChange={e => setEditTypeCode(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0]/40 outline-none">
                                        {Object.entries(QUESTION_TYPE_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Difficulty</label>
                                    <select value={editDiffCode} onChange={e => setEditDiffCode(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0]/40 outline-none">
                                        {Object.entries(DIFFICULTY_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">PYQ</label>
                                    <select value={editPyqCode} onChange={e => setEditPyqCode(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0]/40 outline-none">
                                        {Object.entries(PYQ_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : decoded && (
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                {[
                                    { icon: <Bookmark size={10} />, label: 'Subject', value: decoded.subjectName },
                                    { icon: <Tag size={10} />, label: 'Sub Topic', value: decoded.topicName },
                                    { icon: <BookOpen size={10} />, label: 'Source', value: decoded.sourceName },
                                    { icon: <Eye size={10} />, label: 'Type', value: decoded.typeName },
                                    { icon: <Clock size={10} />, label: 'Difficulty', value: decoded.difficultyName },
                                    { icon: <Hash size={10} />, label: 'PYQ', value: decoded.pyqName },
                                ].map(({ icon, label, value }) => (
                                    <div key={label} className="bg-slate-50 rounded-lg px-2.5 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">{icon}<span className="text-[8px] font-bold uppercase tracking-wider">{label}</span></div>
                                        <p className="text-[11px] font-semibold text-slate-700 truncate">{value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Solution */}
                        {editing ? (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Solution</p>
                                <input type="text" value={editSource} onChange={e => setEditSource(e.target.value)}
                                    placeholder="Source (e.g. NCERT Class 11 Ch.2)"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0]/40 focus:border-[#2278B0] outline-none" />
                                <input type="text" value={editReason} onChange={e => setEditReason(e.target.value)}
                                    placeholder="Why is the correct answer right?"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0]/40 focus:border-[#2278B0] outline-none" />
                                <input type="text" value={editApproach} onChange={e => setEditApproach(e.target.value)}
                                    placeholder="Approach / strategy to solve"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0]/40 focus:border-[#2278B0] outline-none" />
                            </div>
                        ) : q.solution && (
                            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Solution</p>
                                <div className="text-[13px] text-slate-700 space-y-1.5">
                                    <p><span className="font-bold text-emerald-700">Why Correct:</span> {q.solution.correctAnswerReason}</p>
                                    <p><span className="font-bold text-[#2278B0]">Source:</span> {q.solution.sourceOfQuestion}</p>
                                    <p><span className="font-bold text-amber-700">Approach:</span> {q.solution.approachToSolve}</p>
                                </div>
                            </div>
                        )}

                        {/* Approach Brief */}
                        {!editing && <ApproachBriefPanel brief={brief} decoded={decoded} />}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Add Question Form ────────────────────────────────────────────────────────
const AddQuestionForm = ({ onClose, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const subjectCode = SUBJECT_CODES[form.subject] || 'TR';
    const topicMap = TOPIC_CODES[subjectCode] || {};

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setOption = (i, v) => setForm(f => {
        const options = [...f.options];
        options[i] = v;
        return { ...f, options };
    });

    const handleSave = async () => {
        if (!form.text.trim()) { toast.error('Question text is required'); return; }
        if (form.options.some(o => !o.trim())) { toast.error('All 4 options are required'); return; }

        setSaving(true);
        try {
            // Generate proper questionId — serial 0 for manual (will be updated when used)
            const questionId = generateQuestionId(
                subjectCode, form.topicCode, form.sourceCode,
                form.typeCode, form.difficultyCode, form.pyqCode, 0
            );
            // Append timestamp-based serial to disambiguate manual entries
            const realId = questionId.replace('-0000', `-M${String(Date.now()).slice(-4)}`);

            await addDoc(collection(db, 'question_bank'), {
                questionId: realId,
                subjectCode,
                topicCode: form.topicCode,
                sourceCode: form.sourceCode,
                typeCode: form.typeCode,
                difficultyCode: form.difficultyCode,
                pyqCode: form.pyqCode,
                text: form.text.trim(),
                options: form.options.map(o => o.trim()),
                correctAnswer: form.correctAnswer,
                solution: {
                    correctAnswerReason: form.correctAnswerReason.trim(),
                    sourceOfQuestion: form.sourceOfQuestion.trim(),
                    approachToSolve: form.approachToSolve.trim(),
                },
                isAIGenerated: false,
                addedBy: 'manual',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast.success('Question added to bank!');
            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error('Failed to save question');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Plus size={18} className="text-[#2278B0]" /> Add Question to Bank
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Tag Fields */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {/* Subject */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Subject</label>
                            <select value={form.subject} onChange={e => { setField('subject', e.target.value); setField('topicCode', '01'); }}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                {SUBJECTS.filter(s => s !== 'All Subjects').map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        {/* Sub Topic */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Sub Topic</label>
                            <select value={form.topicCode} onChange={e => setField('topicCode', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                {Object.keys(topicMap).length > 0 ? (
                                    Object.entries(topicMap).map(([code, name]) => (
                                        <option key={code} value={code}>{code} — {name}</option>
                                    ))
                                ) : (
                                    <option value="01">01 — General</option>
                                )}
                            </select>
                        </div>
                        {/* Source */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Source</label>
                            <select value={form.sourceCode} onChange={e => setField('sourceCode', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                {Object.entries(SOURCE_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                            </select>
                        </div>
                        {/* Type */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Type</label>
                            <select value={form.typeCode} onChange={e => setField('typeCode', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                {Object.entries(QUESTION_TYPE_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                            </select>
                        </div>
                        {/* Difficulty */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Difficulty</label>
                            <select value={form.difficultyCode} onChange={e => setField('difficultyCode', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                {Object.entries(DIFFICULTY_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                            </select>
                        </div>
                        {/* PYQ */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">PYQ Exam</label>
                            <select value={form.pyqCode} onChange={e => setField('pyqCode', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                {Object.entries(PYQ_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Preview ID */}
                    <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Generated Question ID</p>
                        <QuestionIdDisplay questionId={generateQuestionId(subjectCode, form.topicCode, form.sourceCode, form.typeCode, form.difficultyCode, form.pyqCode, 0)} />
                    </div>

                    {/* Question Text */}
                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Question Text *</label>
                        <textarea value={form.text} onChange={e => setField('text', e.target.value)} rows={4}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#2278B0] outline-none resize-none"
                            placeholder="Enter question text..." />
                    </div>

                    {/* Options */}
                    <div>
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Options * (select correct answer)</label>
                        <div className="space-y-2">
                            {form.options.map((opt, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input type="radio" name="correct" checked={form.correctAnswer === i}
                                        onChange={() => setField('correctAnswer', i)} className="accent-green-600 w-4 h-4 shrink-0" />
                                    <span className="text-sm font-bold text-slate-500 w-5">{String.fromCharCode(65 + i)}.</span>
                                    <input type="text" value={opt} onChange={e => setOption(i, e.target.value)}
                                        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none"
                                        placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Solution */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Solution</label>
                        <input type="text" value={form.sourceOfQuestion} onChange={e => setField('sourceOfQuestion', e.target.value)}
                            placeholder="Source (e.g. NCERT Class 11 Ch.2)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none" />
                        <input type="text" value={form.correctAnswerReason} onChange={e => setField('correctAnswerReason', e.target.value)}
                            placeholder="Why is the correct answer right?" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none" />
                        <input type="text" value={form.approachToSolve} onChange={e => setField('approachToSolve', e.target.value)}
                            placeholder="Approach / strategy to solve" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none" />
                    </div>

                    {/* Save */}
                    <button onClick={handleSave} disabled={saving}
                        className="w-full py-3 bg-[#2278B0] text-white rounded-xl font-bold text-sm hover:bg-[#1b5f8a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <><Loader size={16} className="animate-spin" /> Saving...</> : <><Plus size={16} /> Add to Question Bank</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const QuestionBank = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // Filters
    const [filterSubjectCode, setFilterSubjectCode] = useState('');
    const [filterDiffCode, setFilterDiffCode] = useState('');
    const [filterTypeCode, setFilterTypeCode] = useState('');
    const [filterTopicCode, setFilterTopicCode] = useState('');
    const [filterSource, setFilterSource] = useState(''); // '', 'institution', 'student-dashboard'
    const [searchText, setSearchText] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const ref = collection(db, 'question_bank');
            const constraints = [];

            if (filterSubjectCode) constraints.push(where('subjectCode', '==', filterSubjectCode));
            if (filterTopicCode) constraints.push(where('topicCode', '==', filterTopicCode));
            if (filterDiffCode) constraints.push(where('difficultyCode', '==', filterDiffCode));
            if (filterTypeCode) constraints.push(where('typeCode', '==', filterTypeCode));
            if (filterSource === 'institution') constraints.push(where('source', '==', 'institution'));
            if (filterSource === 'student-dashboard') constraints.push(where('source', '==', 'student-dashboard'));

            let snap;
            try {
                // Try with ordering (requires composite index in Firestore)
                snap = await getDocs(query(ref, ...constraints, orderBy('createdAt', 'desc'), limit(500)));
            } catch (indexErr) {
                // Fallback: query without orderBy if index doesn't exist
                console.warn('Firestore index missing for orderBy, fetching without sort:', indexErr.message);
                snap = await getDocs(query(ref, ...constraints, limit(500)));
            }

            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log(`Question Bank loaded: ${docs.length} questions`);
            setQuestions(docs);
        } catch (err) {
            console.error('Failed to fetch question bank:', err);
            toast.error('Failed to load questions: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }, [filterSubjectCode, filterTopicCode, filterDiffCode, filterTypeCode, filterSource]);

    useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

    // Reset to page 1 when filters / search change
    useEffect(() => { setCurrentPage(1); }, [filterSubjectCode, filterTopicCode, filterDiffCode, filterTypeCode, filterSource, searchText]);

    const filtered = searchText
        ? questions.filter(q => q.text?.toLowerCase().includes(searchText.toLowerCase()))
        : questions;

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const displayed = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen size={24} className="text-[#2278B0]" /> Question Bank
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {filtered.length} question{filtered.length !== 1 ? 's' : ''}
                        {(filterSubjectCode || filterDiffCode || filterTypeCode || filterSource || searchText) ? ' (filtered)' : ''}
                    </p>
                </div>
                <button onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#2278B0] text-white rounded-xl font-bold text-sm hover:bg-[#1b5f8a] transition-colors shadow-sm">
                    <Plus size={16} /> Add Question
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                {/* Top Row: Search & Clear */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                            <Filter size={14} /> Filters
                        </div>
                        {(filterSubjectCode || filterTopicCode || filterDiffCode || filterTypeCode || filterSource || searchText) && (
                            <button onClick={() => { setFilterSubjectCode(''); setFilterTopicCode(''); setFilterDiffCode(''); setFilterTypeCode(''); setFilterSource(''); setSearchText(''); }}
                                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold bg-slate-100 px-2 py-1 rounded-md transition-colors">
                                <X size={12} /> Clear
                            </button>
                        )}
                    </div>
                    <div className="relative w-full sm:w-80">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
                            placeholder="Search question text..."
                            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-[#2278B0] outline-none shadow-sm" />
                    </div>
                </div>

                {/* Dropdowns Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Subject filter */}
                    <select value={filterSubjectCode} onChange={e => { setFilterSubjectCode(e.target.value); setFilterTopicCode(''); }}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none w-full shadow-sm">
                        <option value="">Subject: All</option>
                        {Object.entries(SUBJECT_CODES)
                            .filter(([name]) => name !== 'All Subjects')
                            .map(([name, code]) => (
                                <option key={code} value={code}>Subject: {name}</option>
                            ))}
                    </select>

                    {/* Sub Topic filter */}
                    <select value={filterTopicCode} onChange={e => setFilterTopicCode(e.target.value)}
                        disabled={!filterSubjectCode}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none w-full shadow-sm disabled:bg-slate-50 disabled:text-slate-400">
                        <option value="">Sub Topic: All</option>
                        {filterSubjectCode && TOPIC_CODES[filterSubjectCode] && Object.entries(TOPIC_CODES[filterSubjectCode]).map(([code, name]) => (
                            <option key={code} value={code}>Topic: {code} — {name}</option>
                        ))}
                    </select>

                    {/* Difficulty filter */}
                    <select value={filterDiffCode} onChange={e => setFilterDiffCode(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none w-full shadow-sm">
                        <option value="">Difficulty: All</option>
                        {Object.entries(DIFFICULTY_CODES).map(([name, code]) => (
                            <option key={code} value={code}>Difficulty: {name}</option>
                        ))}
                    </select>

                    {/* Type filter */}
                    <select value={filterTypeCode} onChange={e => setFilterTypeCode(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none w-full shadow-sm">
                        <option value="">Type: All</option>
                        {Object.entries(QUESTION_TYPE_CODES).map(([name, code]) => (
                            <option key={code} value={code}>Type: {name}</option>
                        ))}
                    </select>

                    {/* Source filter */}
                    <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none w-full shadow-sm">
                        <option value="">Source: All</option>
                        <option value="institution">Source: Institution</option>
                        <option value="student-dashboard">Source: Student AI</option>
                    </select>
                </div>
            </div>

            {/* Question List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader size={28} className="animate-spin text-indigo-400" />
                    <span className="ml-3 text-slate-500 text-sm">Loading question bank...</span>
                </div>
            ) : displayed.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No questions found.</p>
                    <p className="text-sm mt-1">Generate tests to automatically populate the bank, or add manually.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {displayed.map((q, i) => <QuestionRow key={q.id} q={q} index={((safeCurrentPage - 1) * pageSize) + i} onUpdated={fetchQuestions} />)}
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && filtered.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3">
                    {/* Left — page info + size selector */}
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span className="font-medium">
                            {((safeCurrentPage - 1) * pageSize) + 1}–{Math.min(safeCurrentPage * pageSize, filtered.length)} of {filtered.length}
                        </span>
                        <span className="text-slate-300">|</span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                            Per page:
                            <select
                                value={pageSize}
                                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0]/80 outline-none"
                            >
                                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                    </div>

                    {/* Right — page buttons */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={safeCurrentPage === 1}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >«</button>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={safeCurrentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >‹ Prev</button>

                        {/* Page number pills */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, idx) =>
                                p === '...' ? (
                                    <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 text-xs select-none">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${p === safeCurrentPage
                                            ? 'bg-[#2278B0] text-white shadow-sm'
                                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >{p}</button>
                                )
                            )
                        }

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={safeCurrentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >Next ›</button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={safeCurrentPage === totalPages}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >»</button>
                    </div>
                </div>
            )}

            {/* Add Form Modal */}
            {showAddForm && (
                <AddQuestionForm
                    onClose={() => setShowAddForm(false)}
                    onSaved={fetchQuestions}
                />
            )}
        </div>
    );
};

export default QuestionBank;

