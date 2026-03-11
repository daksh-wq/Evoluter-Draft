/**
 * Auth Validation Cloud Functions
 * S-3: Server-side onboarding validation and auto user creation
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

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
