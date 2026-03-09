import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth, browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence } from "firebase/auth";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase Initialization failed:", e);
    app = { options: firebaseConfig }; // Fallback minimal app object
}

export const analytics = typeof window !== 'undefined' ? (async () => {
    try {
        return await getAnalytics(app);
    } catch (e) {
        console.warn("Firebase Analytics failed to initialize. Skipping.");
        return null;
    }
})() : null;

export const auth = (() => {
    try {
        return initializeAuth(app, {
            persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
        });
    } catch (e) {
        console.error("Firebase Auth failed to initialize:", e);
        return { app }; // Minimal mock auth
    }
})();

// Modern Firestore Initialization with resilient cache settings
export const db = (() => {
    try {
        return initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
    } catch (e) {
        console.error("Firestore failed to initialize:", e);
        return null;
    }
})();

export const storage = (() => {
    try {
        return getStorage(app);
    } catch (e) {
        return null;
    }
})();
