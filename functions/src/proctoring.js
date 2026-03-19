/**
 * Proctoring Cloud Functions
 * SEC-2: Server-side tab-switch tracking and session validation
 *
 * Production hardening:
 * - runWith() for memory/timeout
 * - Event write moved after session validation (no orphan events)
 * - Timestamp input validation
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
exports.trackTabSwitch = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { testSessionId, eventType = 'tab_switch', timestamp } = data;
        const userId = context.auth.uid;

        if (!testSessionId || typeof testSessionId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'testSessionId is required');
        }

        // Validate timestamp if provided (must be a recent number, within ±5 min)
        let eventTimestamp = admin.firestore.FieldValue.serverTimestamp();
        if (timestamp) {
            const ts = Number(timestamp);
            if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
                // Ignore bad timestamps, use server time instead
                eventTimestamp = admin.firestore.FieldValue.serverTimestamp();
            } else {
                eventTimestamp = admin.firestore.Timestamp.fromMillis(ts);
            }
        }

        const sessionRef = admin.firestore()
            .collection('users').doc(userId)
            .collection('test_sessions').doc(testSessionId);

        // Run transaction FIRST to validate session, THEN log event
        const result = await admin.firestore().runTransaction(async (transaction) => {
            const doc = await transaction.get(sessionRef);

            if (!doc.exists) {
                throw new functions.https.HttpsError('not-found', 'Test session not found');
            }

            const sessionData = doc.data();
            if (sessionData.status !== 'in_progress') {
                throw new functions.https.HttpsError('failed-precondition', 'Test session is not active');
            }

            let violationCount = sessionData.tabSwitchCount || 0;
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

        // Log the proctoring event AFTER successful validation (no orphan events)
        await sessionRef.collection('events').add({
            type: eventType,
            timestamp: eventTimestamp,
            serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent: context.rawRequest?.headers?.['user-agent'] || 'unknown',
        });

        const response = { action: result.action, violationCount: result.violationCount };
        if (result.message) response.message = result.message;
        return response;
    });

/**
 * Validate a test session — checks time limits and tampering flags.
 */
exports.validateTestSession = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const { testSessionId } = data;
        const userId = context.auth.uid;

        if (!testSessionId || typeof testSessionId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'testSessionId is required');
        }

        const sessionDoc = await admin.firestore()
            .collection('users').doc(userId)
            .collection('test_sessions').doc(testSessionId).get();

        if (!sessionDoc.exists) {
            return { valid: false, reason: 'Session not found' };
        }

        const session = sessionDoc.data();

        if (session.status === 'completed') {
            return { valid: false, reason: 'Session already completed', action: 'REDIRECT_RESULTS' };
        }

        if (session.startedAt && session.duration) {
            const elapsedMs = Date.now() - session.startedAt.toMillis();
            const maxMs = session.duration * 60 * 1000;

            if (elapsedMs > maxMs * 1.1) {
                return { valid: false, reason: 'Time limit exceeded', action: 'AUTO_SUBMIT' };
            }
        }

        if (session.flaggedForReview) {
            return { valid: true, flagged: true, reason: session.flagReason, action: 'WARN_USER' };
        }

        return { valid: true };
    });
