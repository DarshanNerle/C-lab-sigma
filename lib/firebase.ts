import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const CONFIG_KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const readEnv = (key: string) => 
  process.env[`NEXT_PUBLIC_${key}`] || 
  process.env[key] || 
  (process.env as any)[`VITE_${key}`];

const buildConfig = () => ({
  apiKey: readEnv('FIREBASE_API_KEY'),
  authDomain: readEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('FIREBASE_APP_ID')
});

interface FirebaseCache {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
}

const globalCache: FirebaseCache = (globalThis as any).__CLAB_FIREBASE__ || { app: null, db: null, auth: null };
(globalThis as any).__CLAB_FIREBASE__ = globalCache;

export function getFirebaseConfigSummary() {
  const missing = CONFIG_KEYS.filter((key) => !readEnv(key));
  return { hasConfig: missing.length === 0, missing };
}

export function getFirebaseAuth(): Auth | null {
  if (globalCache.auth) return globalCache.auth;

  const summary = getFirebaseConfigSummary();
  if (!summary.hasConfig) return null;

  const config = buildConfig();
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  globalCache.auth = getAuth(app);
  return globalCache.auth;
}

export function getFirestoreDb(): Firestore | null {
  if (globalCache.db) return globalCache.db;

  const summary = getFirebaseConfigSummary();
  if (!summary.hasConfig) {
    const error: any = new Error(`Missing Firebase config: ${summary.missing.join(', ')}`);
    error.code = 'FIREBASE_CONFIG_MISSING';
    throw error;
  }

  const config = buildConfig();
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  globalCache.app = app;
  globalCache.db = getFirestore(app);
  return globalCache.db;
}

let db: Firestore | null = null;
let auth: Auth | null = null;
try {
  db = getFirestoreDb();
  auth = getFirebaseAuth();
} catch (error) {
  db = null;
  auth = null;
}

export { db, auth };
