import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { getFirestoreDb } from './firebase.js';

const USERS_COLLECTION = 'users';

const baseSettings = () => ({
  darkMode: true,
  theme: 'dark',
  soundEnabled: true,
  soundVolume: 0.5,
  immersiveMode: false,
  aiMode: 'mini_assistant',
  animationIntensity: 'normal',
  voiceEnabled: false,
  speechRate: 1,
  speechPitch: 1,
  selectedVoice: '',
  voiceGender: 'auto'
});

const baseLabState = () => ({
  selectedChemicals: [],
  volumes: {},
  resultColor: '',
  experimentType: 'custom'
});

const normalizeTimestamp = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeHistoryEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const createdAt = normalizeTimestamp(entry.createdAt);
  return {
    ...entry,
    createdAt: createdAt ? createdAt.toISOString() : entry.createdAt
  };
};

export function buildUserRecord({ email, name = '' }) {
  const now = new Date();
  return {
    userId: email,
    email,
    name,
    level: 1,
    xp: 0,
    badges: [],
    currentLabState: baseLabState(),
    aiHistory: [],
    settings: baseSettings(),
    experiments: [],
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeUserRecord(data = {}, fallbackEmail = '') {
  const createdAt = normalizeTimestamp(data.createdAt);
  const updatedAt = normalizeTimestamp(data.updatedAt);
  const settingsValue = data.settings && typeof data.settings === 'object' ? data.settings : {};
  const labStateValue = data.currentLabState === null
    ? null
    : (data.currentLabState && typeof data.currentLabState === 'object' ? data.currentLabState : baseLabState());

  const history = Array.isArray(data.aiHistory)
    ? data.aiHistory.map(normalizeHistoryEntry).filter(Boolean)
    : [];

  return {
    userId: data.userId || fallbackEmail,
    email: data.email || fallbackEmail,
    name: typeof data.name === 'string' ? data.name : '',
    level: Number.isFinite(Number(data.level)) ? Number(data.level) : 1,
    xp: Number.isFinite(Number(data.xp)) ? Number(data.xp) : 0,
    badges: Array.isArray(data.badges) ? data.badges : [],
    currentLabState: labStateValue,
    aiHistory: history,
    settings: { ...baseSettings(), ...settingsValue },
    experiments: Array.isArray(data.experiments) ? data.experiments : [],
    createdAt: (createdAt || new Date()).toISOString(),
    updatedAt: (updatedAt || createdAt || new Date()).toISOString()
  };
}

export async function getUserDocByEmail(email) {
  const db = getFirestoreDb();
  const directRef = doc(db, USERS_COLLECTION, email);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    const data = directSnap.data();
    return {
      ref: directRef,
      data,
      user: normalizeUserRecord(data, directSnap.id)
    };
  }

  const userQuery = query(collection(db, USERS_COLLECTION), where('email', '==', email), limit(1));
  const querySnap = await getDocs(userQuery);
  const docSnap = querySnap.docs[0];
  if (!docSnap) return null;
  const data = docSnap.data();
  return {
    ref: docSnap.ref,
    data,
    user: normalizeUserRecord(data, docSnap.id)
  };
}
