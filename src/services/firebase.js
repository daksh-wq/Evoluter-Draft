/**
 * Firebase Services
 * Initializes Firebase App, Auth, Analytics, Firestore, and Storage
 * Uses modern persistent cache API (Firestore v10+)
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import logger from '../utils/logger';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Modern Firestore initialization with persistent cache (replaces deprecated enableIndexedDbPersistence)
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// Analytics — only initialize in browser environment
let analytics = null;
try {
    analytics = getAnalytics(app);
} catch (err) {
    logger.warn('Analytics initialization skipped:', err.message);
}
export { analytics };

export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to functions emulator in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    logger.info('Connected to Firebase Functions emulator');
}

export default app;
