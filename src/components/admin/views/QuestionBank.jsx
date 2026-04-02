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
    DIFFICULTY_CODES, PYQ_CODES, SUBJECTS
} from '../../../constants/appConstants';
import { decodeQuestionId, generateQuestionId, getSubjectSources } from '../../../utils/questionTagUtils';
import { toast } from '../../../utils/toast';
import {
    Search, Filter, Plus, ChevronDown, ChevronUp,
    BookOpen, Tag, Sparkles, X, Loader, Eye, RefreshCw,
    Edit2, Save, Trash2
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
    subject: 'Polity & Constitution', topicCode: '01',
    sourceCode: 'SN', typeCode: 'FA', difficultyCode: 'ME', pyqCode: 'NA',
    text: '', options: ['', '', '', ''], correctAnswer: 0,
    correctAnswerReason: '', approachToSolve: '', sourceOfQuestion: ''
};

// ─── Tag Badge ────────────────────────────────────────────────────────────────
const TAG_COLORS = {
    IP: 'bg-violet-100 text-violet-700', AM: 'bg-amber-100 text-amber-700',
    MI: 'bg-orange-100 text-orange-700', IC: 'bg-pink-100 text-pink-700',
    GE: 'bg-teal-100 text-teal-700', EI: 'bg-green-100 text-green-700',
    EN: 'bg-emerald-100 text-emerald-700', ST: 'bg-cyan-100 text-cyan-700',
    CA: 'bg-blue-100 text-blue-700', TR: 'bg-slate-100 text-slate-700',
};
const DIFF_COLORS = {
    ET: 'bg-red-100 text-red-700 border-red-200',
    TO: 'bg-orange-100 text-orange-700 border-orange-200',
    ME: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    ES: 'bg-green-100 text-green-700 border-green-200',
    FO: 'bg-teal-100 text-teal-700 border-teal-200',
};

const TagBadge = ({ code, label, color }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>{label}</span>
);

// ─── Question ID Display ──────────────────────────────────────────────────────
const QuestionIdDisplay = ({ questionId }) => {
    if (!questionId) return null;
    const parts = questionId.split('-');
    if (parts.length !== 7) return <code className="text-xs font-mono text-slate-500">{questionId}</code>;
    const [sub, topic, src, type, diff, pyq, serial] = parts;
    return (
        <div className="flex items-center gap-1 flex-wrap">
            {[
                { code: sub, label: sub, color: TAG_COLORS[sub] || 'bg-slate-100 text-slate-600' },
                { code: topic, label: topic, color: 'bg-slate-100 text-slate-600' },
                { code: src, label: src, color: 'bg-blue-50 text-blue-600' },
                { code: type, label: type, color: 'bg-purple-50 text-purple-600' },
                { code: diff, label: diff, color: DIFF_COLORS[diff] || 'bg-slate-100 text-slate-600' },
                { code: pyq, label: pyq, color: 'bg-indigo-50 text-[#2278B0]' },
                { code: serial, label: `#${serial}`, color: 'bg-slate-50 text-slate-500' },
            ].map((seg, i) => (
                <React.Fragment key={i}>
                    <TagBadge {...seg} />
                    {i < 6 && <span className="text-slate-300 text-xs">–</span>}
                </React.Fragment>
            ))}
        </div>
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

// ─── Question Row ─────────────────────────────────────────────────────────────
const QuestionRow = ({ q, onUpdated }) => {
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
                questionId: realId,
                subjectCode: editSubjectCode,
                topicCode: editTopicCode,
                sourceCode: editSourceCode,
                typeCode: editTypeCode,
                difficultyCode: editDiffCode,
                pyqCode: editPyqCode,
                text: editText.trim(),
                options: editOptions.map(o => o.trim()),
                correctAnswer: editCorrect,
                solution: {
                    correctAnswerReason: editReason.trim(),
                    sourceOfQuestion: editSource.trim(),
                    approachToSolve: editApproach.trim(),
                },
                updatedAt: serverTimestamp(),
            });
            toast.success('Question updated!');
            setEditing(false);
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error(err);
            toast.error('Failed to update question');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, 'question_bank', q.id));
            toast.success('Question deleted');
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete question');
        } finally {
            setDeleting(false);
        }
    };

    const handleGenerateBrief = async () => {
        setGeneratingBrief(true);
        try {
            const generateBrief = httpsCallable(functions, 'generateApproachBrief');
            const result = await generateBrief({ questionId: q.questionId, questionText: q.text });
            setBrief(result.data.approachBrief);
            toast.success('Approach Brief generated!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate brief');
        } finally {
            setGeneratingBrief(false);
        }
    };

    const setEditOption = (i, v) => {
        const opts = [...editOptions];
        opts[i] = v;
        setEditOptions(opts);
    };

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-slate-300 transition-all">
            {/* Summary Row */}
            <div
                className="flex items-start gap-3 p-4 cursor-pointer select-none"
                onClick={() => setOpen(o => !o)}
            >
                <div className="flex-1 min-w-0">
                    <QuestionIdDisplay questionId={q.questionId} />
                    <p className="mt-2 text-sm text-slate-800 line-clamp-2">{q.text}</p>
                </div>
                <div className="shrink-0 text-slate-400 mt-1">
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {/* Detail Expansion */}
            {open && (
                <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {!editing ? (
                            <>
                                <button onClick={handleStartEdit}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
                                    <Edit2 size={12} /> Edit
                                </button>
                                <button onClick={handleDelete} disabled={deleting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                                    {deleting ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleSaveEdit} disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50">
                                    {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button onClick={() => setEditing(false)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
                                    <X size={12} /> Cancel
                                </button>
                            </>
                        )}
                    </div>

                    {/* Question Text */}
                    <div>
                        <p className="text-sm font-bold text-slate-700 mb-2">Question</p>
                        {editing ? (
                            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#2278B0] outline-none resize-none" />
                        ) : (
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{q.text}</p>
                        )}
                    </div>

                    {/* Options */}
                    {editing ? (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Options (select correct)</p>
                            {editOptions.map((opt, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input type="radio" name={`edit-correct-${q.id}`} checked={editCorrect === i}
                                        onChange={() => setEditCorrect(i)} className="accent-green-600 w-4 h-4 shrink-0" />
                                    <span className="text-sm font-bold text-slate-500 w-5">{String.fromCharCode(65 + i)}.</span>
                                    <input type="text" value={opt} onChange={e => setEditOption(i, e.target.value)}
                                        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options?.map((opt, i) => (
                                <div key={i}
                                    className={`text-sm px-3 py-2 rounded-lg border ${i === q.correctAnswer
                                        ? 'bg-green-50 border-green-200 text-green-800 font-medium'
                                        : 'bg-white border-slate-200 text-slate-700'}`}>
                                    <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tag Fields */}
                    {editing ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</label>
                                <select value={editSubjectCode} onChange={e => { setEditSubjectCode(e.target.value); setEditTopicCode('01'); }}
                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                    {Object.entries(SUBJECT_CODES).filter(([n]) => n !== 'All Subjects').map(([name, code]) => (
                                        <option key={code} value={code}>{code} — {name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sub Topic</label>
                                <select value={editTopicCode} onChange={e => setEditTopicCode(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
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
                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                    {Object.entries(SOURCE_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Type</label>
                                <select value={editTypeCode} onChange={e => setEditTypeCode(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                    {Object.entries(QUESTION_TYPE_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Difficulty</label>
                                <select value={editDiffCode} onChange={e => setEditDiffCode(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                    {Object.entries(DIFFICULTY_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">PYQ</label>
                                <select value={editPyqCode} onChange={e => setEditPyqCode(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-[#2278B0] outline-none">
                                    {Object.entries(PYQ_CODES).map(([name, code]) => <option key={code} value={code}>{code} — {name}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : decoded && (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            {[
                                ['Subject', decoded.subjectName],
                                ['Sub Topic', decoded.topicName],
                                ['Source', decoded.sourceName],
                                ['Type', decoded.typeName],
                                ['Difficulty', decoded.difficultyName],
                                ['PYQ', decoded.pyqName],
                            ].map(([k, v]) => (
                                <div key={k}>
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">{k}</span>
                                    <p className="text-slate-700 font-medium">{v}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Solution */}
                    {editing ? (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Solution</p>
                            <input type="text" value={editSource} onChange={e => setEditSource(e.target.value)}
                                placeholder="Source (e.g. NCERT Class 11 Ch.2)"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none" />
                            <input type="text" value={editReason} onChange={e => setEditReason(e.target.value)}
                                placeholder="Why is the correct answer right?"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none" />
                            <input type="text" value={editApproach} onChange={e => setEditApproach(e.target.value)}
                                placeholder="Approach / strategy to solve"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none" />
                        </div>
                    ) : q.solution && (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm space-y-2">
                            <p className="font-bold text-slate-700">Solution</p>
                            <p className="text-slate-600"><span className="font-semibold">Why Correct: </span>{q.solution.correctAnswerReason}</p>
                            <p className="text-slate-600"><span className="font-semibold">Source: </span>{q.solution.sourceOfQuestion}</p>
                            <p className="text-slate-600"><span className="font-semibold">Approach: </span>{q.solution.approachToSolve}</p>
                        </div>
                    )}

                    {/* Approach Brief */}
                    {!editing && <ApproachBriefPanel brief={brief} decoded={decoded} />}

                    {/* Generate Brief Button */}
                    {!editing && !brief && (
                        <button
                            onClick={handleGenerateBrief}
                            disabled={generatingBrief}
                            className="flex items-center gap-2 px-4 py-2 bg-[#2278B0] text-white rounded-lg text-sm font-bold hover:bg-[#1b5f8a] transition-colors disabled:opacity-50"
                        >
                            {generatingBrief ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {generatingBrief ? 'Generating...' : 'Generate Approach Brief'}
                        </button>
                    )}
                    {!editing && brief && (
                        <button
                            onClick={handleGenerateBrief}
                            disabled={generatingBrief}
                            className="flex items-center gap-2 px-3 py-1.5 text-[#2278B0] border border-[#2278B0]/20 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={generatingBrief ? 'animate-spin' : ''} />
                            Regenerate Brief
                        </button>
                    )}
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
    const [filterSource, setFilterSource] = useState(''); // '', 'institution', 'student-dashboard'
    const [searchText, setSearchText] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            let q = collection(db, 'question_bank');
            const constraints = [orderBy('createdAt', 'desc'), limit(200)];
            if (filterSubjectCode) constraints.unshift(where('subjectCode', '==', filterSubjectCode));
            if (filterDiffCode) constraints.unshift(where('difficultyCode', '==', filterDiffCode));
            if (filterTypeCode) constraints.unshift(where('typeCode', '==', filterTypeCode));
            if (filterSource === 'institution') constraints.unshift(where('source', '==', 'institution'));
            if (filterSource === 'student-dashboard') constraints.unshift(where('source', '==', 'student-dashboard'));

            const snap = await getDocs(query(q, ...constraints));
            setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Failed to fetch question bank:', err);
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    }, [filterSubjectCode, filterDiffCode, filterTypeCode, filterSource]);

    useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

    // Reset to page 1 when filters / search change
    useEffect(() => { setCurrentPage(1); }, [filterSubjectCode, filterDiffCode, filterTypeCode, filterSource, searchText]);

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
                        {(filterSubjectCode || filterDiffCode || filterTypeCode || filterSource || searchText) && (
                            <button onClick={() => { setFilterSubjectCode(''); setFilterDiffCode(''); setFilterTypeCode(''); setFilterSource(''); setSearchText(''); }}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Subject filter */}
                    <select value={filterSubjectCode} onChange={e => setFilterSubjectCode(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2278B0] outline-none w-full shadow-sm">
                        <option value="">Subject: All</option>
                        {Object.entries(SUBJECT_CODES).map(([name, code]) => (
                            <option key={code} value={code}>Subject: {name}</option>
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
                <div className="space-y-3">
                    {displayed.map(q => <QuestionRow key={q.id} q={q} onUpdated={fetchQuestions} />)}
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

