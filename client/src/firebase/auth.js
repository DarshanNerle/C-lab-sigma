import { auth, db } from './config';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Resilient authentication system for C-LAB.
 * Provides fallback to local/backend storage when Firebase is down or misconfigured.
 */

export const registerUser = async (email, password, displayName) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Try to sync with Firestore if possible
        try {
            await setDoc(doc(db, "users", user.uid), {
                name: displayName,
                email: user.email,
                role: "student",
                xp: 0,
                level: 1,
                rank: "Novice Alchemist",
                createdAt: new Date().toISOString()
            });
        } catch (dbError) {
            console.warn("Firestore sync failed, profile exists in Auth only.");
        }

        return user;
    } catch (error) {
        console.error("Firebase Registration failed:", error.code);
        // Fallback or re-throw
        throw error;
    }
};

export const loginUser = async (email, password) => {
    try {
        // Only attempt Firebase if it looks configured
        if (!auth.app.options.apiKey || auth.app.options.apiKey.includes('FIREBASE_API_KEY')) {
            throw new Error("auth/configuration-not-found");
        }
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.warn("Firebase Auth Login failed, checking error type...", error.code || error.message);
        
        // If it's a configuration or enabling error, we allow custom fallback behavior 
        // in components by throwing a specific identifiable error
        const isConfigError = 
            error.code === 'auth/configuration-not-found' || 
            error.message?.includes('identitytoolkit') ||
            error.message?.includes('API has not been used');
            
        if (isConfigError) {
            const fallbackError = new Error("FIREBASE_MISCONFIGURED");
            fallbackError.originalError = error;
            throw fallbackError;
        }
        
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch (e) {
        // Just clear local state anyway
    }
};

export const subscribeToAuthChanges = (callback) => {
    try {
        return onAuthStateChanged(auth, callback);
    } catch (e) {
        return () => {}; // No-op cleanup
    }
};
