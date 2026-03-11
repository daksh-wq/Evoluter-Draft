/**
 * Proctoring Cloud Functions
 * SEC-2: Server-side tab-switch tracking and session validation
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

/** Maximum tab switches before auto-flagging */
const MAX_VIOLATIONS_FLAG = 5;
/** Tab switches that trigger a warning */
const WARNING_THRESHOLD = 3;

/**
 * Track tab switch events server-side.
 * Cannot be bypassed via DevTools since the count is stored in Firestore.
 */
exports.trackTabSwitch = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { testSessionId, eventType = 'tab_switch', timestamp } = data;
    const userId = context.auth.uid;

    if (!testSessionId) {
        throw new functions.https.HttpsError('invalid-argument', 'testSessionId is required');
    }

    // Validate session exists and belongs to user
    const sessionRef = admin.firestore()
        .collection('users').doc(userId)
        .collection('test_sessions').doc(testSessionId);

    // We can skip the initial read if we trust the client ID, but for security validaton we keep it.
    // Optimization: We could combine validation with the update if we accept potential failures, 
    // but for now let's keep the check to ensure status is 'in_progress'.
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Test session not found');
    }

    if (sessionDoc.data().status !== 'in_progress') {
        throw new functions.https.HttpsError('failed-precondition', 'Test session is not active');
    }

    // Log the proctoring event (Keep for audit trail)
    await sessionRef.collection('events').add({
        type: eventType,
        timestamp: timestamp
            ? admin.firestore.Timestamp.fromMillis(timestamp)
            : admin.firestore.FieldValue.serverTimestamp(),
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: context.rawRequest?.headers?.['user-agent'] || 'unknown',
    });

    let violationCount = sessionDoc.data().tabSwitchCount || 0;

    // Optimized: Atomic increment instead of counting all documents
    if (eventType === 'tab_switch') {
        await sessionRef.update({
            tabSwitchCount: admin.firestore.FieldValue.increment(1)
        });

        // Update local variable to reflect the new state (approximate is fine, but +1 is accurate)
        violationCount += 1;
    }

    // Auto-flag if too many violations
    if (violationCount >= MAX_VIOLATIONS_FLAG) {
        await sessionRef.update({
            flaggedForReview: true,
            flagReason: `Excessive tab switches (${violationCount})`,
            flaggedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            action: 'FLAG_FOR_REVIEW',
            violationCount,
            message: 'Too many violations detected. Test may be auto-submitted.'
        };
    }

    if (violationCount >= WARNING_THRESHOLD) {
        return {
            action: 'WARNING',
            violationCount,
            message: `Warning: ${violationCount} tab switches detected. ${MAX_VIOLATIONS_FLAG - violationCount} remaining before flagging.`
        };
    }

    return {
        action: 'LOG',
        violationCount
    };
});

/**
 * Validate a test session — checks time limits and tampering flags.
 */
exports.validateTestSession = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { testSessionId } = data;
    const userId = context.auth.uid;

    if (!testSessionId) {
        throw new functions.https.HttpsError('invalid-argument', 'testSessionId is required');
    }

    const sessionDoc = await admin.firestore()
        .collection('users').doc(userId)
        .collection('test_sessions').doc(testSessionId).get();

    if (!sessionDoc.exists) {
        return { valid: false, reason: 'Session not found' };
    }

    const session = sessionDoc.data();

    // Check if already completed
    if (session.status === 'completed') {
        return { valid: false, reason: 'Session already completed', action: 'REDIRECT_RESULTS' };
    }

    // Check time limits (if duration is set)
    if (session.startedAt && session.duration) {
        const elapsedMs = Date.now() - session.startedAt.toMillis();
        const maxMs = session.duration * 60 * 1000; // Convert minutes to ms

        if (elapsedMs > maxMs * 1.1) { // 10% buffer
            return {
                valid: false,
                reason: 'Time limit exceeded',
                action: 'AUTO_SUBMIT'
            };
        }
    }

    // Check for tampering flags
    if (session.flaggedForReview) {
        return {
            valid: true, // Still valid but flagged
            flagged: true,
            reason: session.flagReason,
            action: 'WARN_USER'
        };
    }

    return { valid: true };
});
