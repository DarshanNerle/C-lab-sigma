import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const CONFIG_KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const readEnv = (key) => process.env[key] || process.env[`VITE_${key}`];

const buildConfig = () => ({
  apiKey: readEnv('FIREBASE_API_KEY'),
  authDomain: readEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('FIREBASE_APP_ID')
});

const globalCache = global.__CLAB_FIREBASE__ || { app: null, db: null };
global.__CLAB_FIREBASE__ = globalCache;

export function getFirebaseConfigSummary() {
  const missing = CONFIG_KEYS.filter((key) => !readEnv(key));
  return { hasConfig: missing.length === 0, missing };
}

export function getFirestoreDb() {
  if (globalCache.db) return globalCache.db;

  const summary = getFirebaseConfigSummary();
  if (!summary.hasConfig) {
    const error = new Error(`Missing Firebase config: ${summary.missing.join(', ')}`);
    error.code = 'FIREBASE_CONFIG_MISSING';
    throw error;
  }

  const config = buildConfig();
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  globalCache.app = app;
  globalCache.db = getFirestore(app);
  return globalCache.db;
}

let db = null;
try {
  db = getFirestoreDb();
} catch (error) {
  db = null;
}

export { db };
