/**
 * Evoluter Cloud Functions — Entry Point
 * 
 * Exports all Cloud Functions used by the Evoluter Engine.
 * Scalable Architecture with centralized utilities.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const RateLimiter = require('./src/utils/rateLimiter');
const DistributedCounter = require('./src/utils/distributedCounter');

// Initialize Firebase Admin SDK
admin.initializeApp();

// ─── UTILITIES (High-Scale Tools) ────────────────────────
// Exported for use in other functions, or as callable verification
exports.checkRateLimit = async (data, context) => {
    // Example callable to test rate limiting from client
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    await RateLimiter.check(context.auth.uid, 'test_action', 5, 60);
    return { success: true };
};


// ─── Test Generation & Submission (SEC-1) ────────────────
const testGeneration = require('./src/testGeneration');
exports.generateTest = testGeneration.generateTest;
exports.submitTest = testGeneration.submitTest;

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

