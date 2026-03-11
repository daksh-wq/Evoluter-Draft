/**
 * Auth Validation Cloud Functions
 * S-3: Server-side onboarding validation and auto user creation
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
exports.validateUserSession = functions.https.onCall(async (data, context) => {
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
            action: 'REDIRECT_ONBOARDING'
        };
    }

    const userData = userDoc.data();
    const missingFields = REQUIRED_FIELDS.filter(f => !userData[f]);

    if (missingFields.length > 0) {
        return {
            valid: true, // Auth is valid
            onboardingComplete: false,
            missingFields,
            action: 'REDIRECT_ONBOARDING'
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
        }
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
            lastActiveDate: null
        }
    });

    console.log(`Created base user doc for new auth user: ${user.uid}`);
});

/**
 * Validate an email domain via DNS MX records.
 * Can be called by the frontend *before* attempting user creation.
 */
exports.validateEmailDNS = functions.https.onCall(async (data, context) => {
    try {
        // 1. Extract email safely. Depending on SDK version, it might be in data.email or just data if it's not nested.
        const emailToValidate = data?.email || (typeof data === 'string' ? data : null);
        
        if (!emailToValidate || typeof emailToValidate !== 'string') {
            return { valid: false, reason: 'No valid string email provided.' };
        }

        const email = emailToValidate.toLowerCase();
        const parts = email.split('@');
        
        if (parts.length !== 2) {
            return { valid: false, reason: 'Malformed email address.' };
        }
        
        const domain = parts[1];

        // 2. Block known dummy domains quickly without DNS lookup
        const blockedDomains = [
            'example.com', 'test.com', 'tempmail.com', 
            'mailinator.com', '10minutemail.com', 'guerrillamail.com'
        ];
        
        if (blockedDomains.includes(domain)) {
            return { 
                valid: false, 
                reason: `The domain '@${domain}' is a disposable email provider. Please use a real email address.` 
            };
        }

        // 3. Deep DNS Validation: Check for Mail Exchange (MX) records
        try {
            const mxRecords = await resolveMx(domain);
            if (!mxRecords || mxRecords.length === 0) {
                return { 
                    valid: false, 
                    reason: `The domain '@${domain}' cannot receive emails. Please check for spelling errors.` 
                };
            }
        } catch (dnsError) {
            // dns.resolveMx throws if domain doesn't exist or has no MX records
            return { 
                valid: false, 
                reason: `Invalid email domain or DNS failure for '@${domain}'. Please provide a real email.` 
            };
        }
        
        return { valid: true };
    } catch (unexpectedError) {
        console.error("validateEmailDNS Error: ", unexpectedError);
        // Sometimes returning an object is better than throwing an HttpsError to avoid 'internal' masking
        return { valid: false, reason: `Server error during validation: ${unexpectedError.message}` };
    }
});
