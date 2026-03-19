/**
 * Auth Validation Cloud Functions
 * S-3: Server-side onboarding validation and auto user creation
 *
 * Production hardening:
 * - runWith() on all functions
 * - DNS resolution timeout guard (5s)
 * - validateEmailDNS now checks auth (HIGH-6)
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const dns = require('dns');
const util = require('util');

const resolveMx = util.promisify(dns.resolveMx);

/** Required fields for onboarding to be considered complete */
const REQUIRED_FIELDS = ['targetExam', 'targetYear', 'name'];

/**
 * Validate that a user has completed onboarding.
 * Called from the client before allowing access to dashboard.
 */
exports.validateUserSession = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        const userId = context.auth.uid;

        const userDoc = await admin.firestore()
            .collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return {
                valid: false,
                onboardingComplete: false,
                reason: 'User profile not found',
                action: 'REDIRECT_ONBOARDING',
            };
        }

        const userData = userDoc.data();
        const missingFields = REQUIRED_FIELDS.filter(f => !userData[f]);

        if (missingFields.length > 0) {
            return {
                valid: true,
                onboardingComplete: false,
                missingFields,
                action: 'REDIRECT_ONBOARDING',
            };
        }

        return {
            valid: true,
            onboardingComplete: true,
            userData: {
                name: userData.name,
                targetExam: userData.targetExam,
                targetYear: userData.targetYear,
                photoURL: userData.photoURL || null,
            },
        };
    });

/**
 * Auth trigger — automatically create a base user document
 * when a new Firebase Auth account is created.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const userRef = admin.firestore().collection('users').doc(user.uid);
    const doc = await userRef.get();

    // Don't overwrite if doc already exists (e.g., from onboarding)
    if (doc.exists) return;

    await userRef.set({
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        onboardingComplete: false,
        stats: {
            testsAttempted: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            xp: 0,
            streak: 0,
            longestStreak: 0,
            lastActiveDate: null,
        },
    });

    console.log(`Created base user doc for new auth user: ${user.uid}`);
});

/**
 * Validate an email domain via DNS MX records.
 * Now requires authentication to prevent abuse as a free DNS oracle (HIGH-6).
 */
exports.validateEmailDNS = functions
    .runWith({ memory: '256MB', timeoutSeconds: 15 })
    .https.onCall(async (data, context) => {
        // Require authentication to prevent abuse
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
        }

        try {
            const emailToValidate = data?.email || (typeof data === 'string' ? data : null);

            if (!emailToValidate || typeof emailToValidate !== 'string') {
                return { valid: false, reason: 'No valid string email provided.' };
            }

            const email = emailToValidate.toLowerCase().trim();

            // Basic format check
            if (email.length > 320) {
                return { valid: false, reason: 'Email address is too long.' };
            }

            const parts = email.split('@');
            if (parts.length !== 2) {
                return { valid: false, reason: 'Malformed email address.' };
            }

            const domain = parts[1];

            // Block known dummy domains quickly without DNS lookup
            const blockedDomains = [
                'example.com', 'test.com', 'tempmail.com',
                'mailinator.com', '10minutemail.com', 'guerrillamail.com',
                'throwaway.email', 'yopmail.com', 'sharklasers.com',
            ];

            if (blockedDomains.includes(domain)) {
                return {
                    valid: false,
                    reason: `The domain '@${domain}' is a disposable email provider. Please use a real email address.`,
                };
            }

            // DNS Validation with timeout guard (5s max)
            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
                );
                const mxRecords = await Promise.race([resolveMx(domain), timeoutPromise]);

                if (!mxRecords || mxRecords.length === 0) {
                    return {
                        valid: false,
                        reason: `The domain '@${domain}' cannot receive emails. Please check for spelling errors.`,
                    };
                }
            } catch (dnsError) {
                if (dnsError.message === 'DNS lookup timeout') {
                    return { valid: false, reason: `DNS lookup timed out for '@${domain}'. Please try again.` };
                }
                return {
                    valid: false,
                    reason: `Invalid email domain or DNS failure for '@${domain}'. Please provide a real email.`,
                };
            }

            return { valid: true };
        } catch (unexpectedError) {
            console.error('validateEmailDNS Error:', unexpectedError.message);
            return { valid: false, reason: 'Server error during validation. Please try again.' };
        }
    });
