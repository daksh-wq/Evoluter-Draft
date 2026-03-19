import { useState, useEffect, useCallback, useRef } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';
import { DEFAULT_USER_STATS } from '../constants/data';
import { syncUserStreak } from '../services/userService';
import logger from '../utils/logger';
import { showToast } from '../utils/errorHandler';
import useUserStore from '../stores/userStore';
import { toast } from '../utils/toast';

/**
 * Required fields that must be present in Firestore user doc
 * for onboarding to be considered complete.
 */
const REQUIRED_ONBOARDING_FIELDS = ['targetExam', 'targetYear', 'name'];

/**
 * Custom hook for Firebase Authentication
 * Handles login, logout, and user session state
 */
export function useAuth() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null); // Extended user data from Firestore
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginError, setLoginError] = useState('');

    /**
     * Check whether onboarding is fully complete
     * Prevents dashboard access if required fields are missing
     */
    const isOnboardingComplete = useCallback((data) => {
        if (!data) return false;

        // Admin always bypasses onboarding
        if (data.role === 'admin') return true;

        // Institution Validation
        if (data.role === 'institution') {
            return !!(data.name && data.institutionProfile);
        }

        // Student Validation
        return REQUIRED_ONBOARDING_FIELDS.every(field => {
            const value = data[field];
            return value !== undefined && value !== null && value !== '';
        });
    }, []);

    const prevBatchesLengthRef = useRef(0);
    const prevInstitutionsLengthRef = useRef(0);
    const hasSyncedStreakRef = useRef(false);

    // Listen for auth state changes and real-time user document changes
    useEffect(() => {
        let unsubscribeSnapshot = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setAuthLoading(true);

            // Clean up previous snapshot listener if it exists
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (currentUser) {
                setUser(currentUser);
                setIsAuthenticated(true);

                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);

                    // Use onSnapshot for REAL-TIME updates instead of getDoc
                    unsubscribeSnapshot = onSnapshot(userDocRef, (userDoc) => {
                        if (userDoc.exists()) {
                            const data = userDoc.data();

                            // Check for new batch additions to trigger real-time notification
                            const currentBatches = data.enrolledBatches || [];
                            if (prevBatchesLengthRef.current > 0 && currentBatches.length > prevBatchesLengthRef.current) {
                                showToast('You have been added to a new institution batch!', 'success', 8000);
                            }
                            prevBatchesLengthRef.current = currentBatches.length;

                            // Check for new institution additions
                            const currentInstitutions = data.joinedInstitutions || [];
                            if (prevInstitutionsLengthRef.current > 0 && currentInstitutions.length > prevInstitutionsLengthRef.current) {
                                showToast('You have been formally added to a new institution!', 'success', 8000);
                            }
                            prevInstitutionsLengthRef.current = currentInstitutions.length;

                            // Auto-migrate unsupported exams (like SSC CGL or Banking) to UPSC CSE
                            const validExams = ['UPSC CSE', 'State PSC'];
                            if (data.role === 'student' && data.targetExam && !validExams.includes(data.targetExam)) {
                                logger.info(`Auto-migrating user ${currentUser.uid} exam from ${data.targetExam} to UPSC CSE`);
                                import('firebase/firestore').then(({ updateDoc }) => {
                                    updateDoc(userDocRef, { targetExam: 'UPSC CSE' }).catch(e => logger.error("Failed to migrate exam:", e));
                                });
                                data.targetExam = 'UPSC CSE'; // Update local immediately
                            }

                            // Only set userData if onboarding is complete
                            if (isOnboardingComplete(data)) {
                                setUserData(data);
                                // Sync stats to global store for real-time dashboard updates
                                if (data.stats) {
                                    useUserStore.getState().setStats({
                                        ...useUserStore.getState().stats,
                                        ...data.stats,
                                        streakDays: data.stats.streak || data.stats.streakDays || 0
                                    });
                                }

                                // Sync Streak once per session when data is ready
                                if (!hasSyncedStreakRef.current && data.role === 'student') {
                                    hasSyncedStreakRef.current = true;
                                    syncUserStreak(currentUser.uid);
                                }
                            } else {
                                logger.warn('User onboarding incomplete, missing fields', {
                                    uid: currentUser.uid,
                                    missingFields: REQUIRED_ONBOARDING_FIELDS.filter(f => !data[f])
                                });
                                setUserData(null);
                            }
                        } else {
                            setUserData(null); // User exists in Auth but not in DB (Needs onboarding)
                        }
                        setAuthLoading(false); // Clear loading state after first snapshot resolving
                    }, (error) => {
                        if (error.code === 'permission-denied') {
                            logger.warn("Snapshot permission denied (expected during signup):", error.message);
                            setUserData(null);
                            setAuthLoading(false);
                        } else {
                            logger.error("Error listening to user data:", error);
                            setAuthLoading(false);
                        }
                    });
                } catch (error) {
                    logger.error("Error setting up user listener:", error);
                    setAuthLoading(false);
                }
            } else {
                setUser(null);
                setUserData(null);
                setIsAuthenticated(false);
                setAuthLoading(false);
            }
        });

        return () => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            unsubscribeAuth();
        };
    }, [isOnboardingComplete]);

    // Google Sign In
    const handleGoogleLogin = useCallback(async () => {
        setLoginError('');
        setAuthLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const name = result.user.displayName?.split(' ')[0] || 'back';
            toast.success(`Welcome back, ${name}!`);
        } catch (error) {
            logger.error("Google Sign In Error:", error);
            setLoginError('Failed to sign in with Google. Please try again.');
            toast.error('Google sign-in failed. Please try again.');
        } finally {
            setAuthLoading(false);
        }
    }, []);

    // Email Login
    const handleEmailLogin = useCallback(async (email, password) => {
        setLoginError('');
        setAuthLoading(true);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const name = result.user.displayName?.split(' ')[0] || 'back';
            toast.success(`Welcome back, ${name}!`);
        } catch (error) {
            logger.error("Login Error:", error);
            setLoginError('Invalid email or password.');
            toast.error('Invalid email or password.');
        } finally {
            setAuthLoading(false);
        }
    }, []);

    // Email Signup
    const handleEmailSignup = useCallback(async (name, email, password) => {
        setLoginError('');
        setAuthLoading(true);
        try {
            const emailLower = email.toLowerCase();
            const domain = emailLower.split('@')[1];

            // Bug #7 fix: guard against malformed emails with no @ symbol
            // Without this, domain is undefined and the DNS call becomes ?name=undefined
            if (!domain) {
                throw {
                    code: 'custom/invalid-email-dns',
                    reason: 'Please enter a valid email address.'
                };
            }

            // 1. Block known dummy domains quickly
            const blockedDomains = [
                'example.com', 'test.com', 'tempmail.com',
                'mailinator.com', '10minutemail.com', 'guerrillamail.com',
                'none.com', 'fake.com', 'yopmail.com', 'asdf.com'
            ];

            if (blockedDomains.includes(domain)) {
                throw {
                    code: 'custom/invalid-email-dns',
                    reason: `The domain '@${domain}' is a disposable email provider. Please use a real email address.`
                };
            }

            // 2. Perform Deep DNS Validation directly from frontend via Google's public DNS over HTTPS
            try {
                const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
                const data = await response.json();

                // If the Answer array doesn't exist or is empty, the domain has no MX records
                if (!data.Answer || data.Answer.length === 0) {
                    throw {
                        code: 'custom/invalid-email-dns',
                        reason: `The domain '@${domain}' cannot receive emails. Please check for spelling errors.`
                    };
                }
            } catch (networkOrDnsError) {
                // If it's our custom throw, bubble it up. Otherwise, it might be a fetch error, let it pass to not block real users if DNS API is down.
                if (networkOrDnsError.code === 'custom/invalid-email-dns') throw networkOrDnsError;
                logger.warn("DNS check failed, falling back to allowing signup", networkOrDnsError);
            }

            // STEP 3: Create user in Firebase Auth
            const result = await createUserWithEmailAndPassword(auth, emailLower, password);
            const newUser = result.user;

            // Update Auth Profile
            await updateProfile(newUser, { displayName: name });

            toast.success(`Account created! Welcome, ${name.split(' ')[0]}!`);

            // Note: We DO NOT create the Firestore doc here.
            // This ensures the App check (!userData) sends the user to OnboardingView
            // where they can select their Target Exam and Year.

        } catch (error) {
            logger.error("Signup Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                setLoginError('Account already exists. Please Sign In.');
                toast.error('An account with this email already exists.');
            } else if (error.code === 'auth/weak-password') {
                setLoginError('Password should be at least 6 characters.');
                toast.error('Password should be at least 6 characters.');
            } else if (error.code === 'custom/invalid-email-dns') {
                setLoginError(`Email validation failed: ${error.reason || 'Disposable or invalid domains are not allowed.'}`);
                toast.error(error.reason || 'Please use a valid email address.');
            } else {
                setLoginError('Failed to create account. Try again.');
                toast.error('Failed to create account. Please try again.');
            }
        } finally {
            setAuthLoading(false);
        }
    }, []);

    // Logout
    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            toast.info('You have been signed out.');
        } catch (error) {
            logger.error("Logout Error:", error);
            toast.error('Sign out failed. Please try again.');
        }
    }, []);

    // Refresh User Data
    const refreshUser = useCallback(async () => {
        if (auth.currentUser) {
            try {
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (isOnboardingComplete(data)) {
                        setUserData(data);
                    } else {
                        setUserData(null);
                    }
                }
            } catch (error) {
                logger.error("Error refreshing user:", error);
            }
        }
    }, [isOnboardingComplete]);

    const isAdmin = userData?.role === 'admin';

    return {
        user,
        userData,
        isAuthenticated,
        authLoading,
        loginError,
        isAdmin,
        isOnboardingComplete,
        handleGoogleLogin,
        handleEmailLogin,
        handleEmailSignup,
        handleLogout,
        refreshUser,
    };
}

export default useAuth;
