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

    // Log the proctoring event (Keep for audit trail) - done outside transaction
    await sessionRef.collection('events').add({
        type: eventType,
        timestamp: timestamp
            ? admin.firestore.Timestamp.fromMillis(timestamp)
            : admin.firestore.FieldValue.serverTimestamp(),
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: context.rawRequest?.headers?.['user-agent'] || 'unknown',
    });

    // Run a transaction to prevent race conditions during rapid tab switches
    const result = await admin.firestore().runTransaction(async (transaction) => {
        const doc = await transaction.get(sessionRef);
        
        if (!doc.exists) {
            throw new functions.https.HttpsError('not-found', 'Test session not found');
        }

        const data = doc.data();
        if (data.status !== 'in_progress') {
            throw new functions.https.HttpsError('failed-precondition', 'Test session is not active');
        }

        let violationCount = data.tabSwitchCount || 0;
        let action = 'LOG';
        let message = '';
        
        if (eventType === 'tab_switch') {
            violationCount += 1;
            const updates = { tabSwitchCount: violationCount };
            
            if (violationCount >= MAX_VIOLATIONS_FLAG) {
                updates.flaggedForReview = true;
                updates.flagReason = `Excessive tab switches (${violationCount})`;
                updates.flaggedAt = admin.firestore.FieldValue.serverTimestamp();
                action = 'FLAG_FOR_REVIEW';
                message = 'Too many violations detected. Test may be auto-submitted.';
            } else if (violationCount >= WARNING_THRESHOLD) {
                action = 'WARNING';
                message = `Warning: ${violationCount} tab switches detected. ${MAX_VIOLATIONS_FLAG - violationCount} remaining before flagging.`;
            }
            
            transaction.update(sessionRef, updates);
        } else {
            if (violationCount >= MAX_VIOLATIONS_FLAG) {
                action = 'FLAG_FOR_REVIEW';
                message = 'Too many violations detected. Test may be auto-submitted.';
            } else if (violationCount >= WARNING_THRESHOLD) {
                action = 'WARNING';
                message = `Warning: ${violationCount} tab switches detected. ${MAX_VIOLATIONS_FLAG - violationCount} remaining before flagging.`;
            }
        }
        
        return { action, violationCount, message };
    });

    if (result.message) {
        return {
            action: result.action,
            violationCount: result.violationCount,
            message: result.message
        };
    }

    return {
        action: result.action,
        violationCount: result.violationCount
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
