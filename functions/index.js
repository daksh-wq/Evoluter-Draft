/**
 * Evoluter Cloud Functions — Entry Point
 *
 * Exports all Cloud Functions used by the Evoluter Engine.
 * Scalable Architecture with centralized utilities.
 */
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK first
admin.initializeApp();

// ─── Test Generation & Submission (SEC-1) ────────────────
const testGeneration = require('./src/testGeneration');
exports.generateTest = testGeneration.generateTest;
exports.submitTest = testGeneration.submitTest;
exports.syncInstitutionQuestions = testGeneration.syncInstitutionQuestions;
exports.syncStudentGeneratedQuestions = testGeneration.syncStudentGeneratedQuestions;

// ─── Proctoring (SEC-2) ─────────────────────────────────
const proctoring = require('./src/proctoring');
exports.trackTabSwitch = proctoring.trackTabSwitch;
exports.validateTestSession = proctoring.validateTestSession;

// ─── Auth Validation (S-3) ──────────────────────────────
const authValidation = require('./src/authValidation');
exports.validateUserSession = authValidation.validateUserSession;
exports.onUserCreate = authValidation.onUserCreate;
exports.validateEmailDNS = authValidation.validateEmailDNS;

// ─── Usage Stats (SCALE-4) ──────────────────────────────
const usageStats = require('./src/usageStats');
exports.getUserUsageStats = usageStats.getUserUsageStats;
exports.getAPIUsageStats = usageStats.getAPIUsageStats;

// ─── Flashcards (F-1) ───────────────────────────────────
const flashcards = require('./src/flashcards');
exports.generateFlashcards = flashcards.generateFlashcards;
exports.reviewFlashcard = flashcards.reviewFlashcard;

// ─── PDF Processing (F-5) ───────────────────────────────
const pdfProcessing = require('./src/pdfProcessing');
exports.extractTextFromPDF = pdfProcessing.extractTextFromPDF;
exports.generateQuestionsFromPDF = pdfProcessing.generateQuestionsFromPDF;

// ─── Question Bank — Approach Brief (QB-1) ──────────────
const questionBrief = require('./src/questionBrief');
exports.generateApproachBrief = questionBrief.generateApproachBrief;

// ─── Scheduled Cleanup (SCALE-5) ────────────────────────
const scheduledCleanup = require('./src/scheduledCleanup');
exports.cleanupExpiredData = scheduledCleanup.cleanupExpiredData;

// --- Gemini AI Proxy (SEC-1) --- all AI calls server-side, key never in client
const geminiProxy = require('./src/geminiProxy');
exports.geminiGenerateQuestions    = geminiProxy.geminiGenerateQuestions;
exports.geminiGenerateFromDocument = geminiProxy.geminiGenerateFromDocument;
exports.geminiEvaluateAnswer       = geminiProxy.geminiEvaluateAnswer;
exports.geminiAnalyzePerformance   = geminiProxy.geminiAnalyzePerformance;
exports.geminiSuggestTopics        = geminiProxy.geminiSuggestTopics;
exports.geminiGenerateNews         = geminiProxy.geminiGenerateNews;
exports.geminiChat                 = geminiProxy.geminiChat;
