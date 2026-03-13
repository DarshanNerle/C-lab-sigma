import { safeLocalStorage } from '../utils/safeStorage';
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const LOCAL_KEYS = {
    user: 'app_user',
    settings: 'app_settings',
    labState: 'app_labState',
    aiHistory: 'app_aiHistory',
    experiments: 'app_experiments'
};

const STORAGE_MODES = {
    FIREBASE: 'firebase',
    LOCAL: 'local'
};

const MODE_SWITCH_MESSAGE = 'Cloud storage unavailable, switching to local mode';

const inFlightWrites = new Map();

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
    if (value instanceof Date) return value;
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

const normalizeUserRecord = (data = {}, fallbackEmail = '', fallbackUid = '') => {
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
        userId: data.userId || fallbackUid || fallbackEmail,
        email: data.email || fallbackEmail,
        name: typeof data.name === 'string' ? data.name : '',
        role: typeof data.role === 'string' ? data.role : 'student',
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
};

const buildUserRecord = ({ uid, email, name = '' }) => {
    const now = new Date();
    return {
        userId: uid || email,
        email,
        name,
        role: 'student',
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
};

const normalizeEmail = (email) => {
    if (typeof email !== 'string') return '';
    return email.trim().toLowerCase();
};

const isFirebaseConfigured = () => {
    const apiKey = auth?.app?.options?.apiKey;
    if (!apiKey) return false;
    const raw = String(apiKey);
    if (!raw || raw.includes('FIREBASE_API_KEY') || raw.includes('undefined')) return false;
    return true;
};

const clampNumber = (value, min, max, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

const sanitizeSettings = (settings = {}) => {
    if (!settings || typeof settings !== 'object') {
        return {};
    }

    const aiMode = settings.aiMode === 'full_learning' ? 'full_learning' : 'mini_assistant';
    const animationIntensity = settings.animationIntensity === 'reduced' ? 'reduced' : 'normal';
    const theme = settings.theme === 'light' || settings.darkMode === false ? 'light' : 'dark';

    return {
        darkMode: theme === 'dark',
        theme,
        soundEnabled: settings.soundEnabled !== false,
        soundVolume: clampNumber(settings.soundVolume, 0, 1, 0.5),
        immersiveMode: !!settings.immersiveMode,
        aiMode,
        animationIntensity,
        voiceEnabled: !!settings.voiceEnabled,
        speechRate: clampNumber(settings.speechRate, 0.5, 2, 1),
        speechPitch: clampNumber(settings.speechPitch, 0, 2, 1),
        selectedVoice: typeof settings.selectedVoice === 'string' ? settings.selectedVoice.slice(0, 120) : '',
        voiceGender: settings.voiceGender === 'male' || settings.voiceGender === 'female' ? settings.voiceGender : 'auto'
    };
};

const sanitizeLabState = (labState = {}) => {
    if (!labState || typeof labState !== 'object') {
        return null;
    }

    const selectedChemicals = Array.isArray(labState.selectedChemicals)
        ? labState.selectedChemicals.slice(0, 50)
        : [];

    const volumes = typeof labState.volumes === 'object' && labState.volumes !== null
        ? labState.volumes
        : {};

    return {
        selectedChemicals,
        volumes,
        resultColor: typeof labState.resultColor === 'string' ? labState.resultColor : '',
        experimentType: typeof labState.experimentType === 'string' ? labState.experimentType : 'custom'
    };
};

const upsertExperiment = (list, experiment) => {
    const experiments = Array.isArray(list) ? [...list] : [];
    const index = experiments.findIndex((item) => item?.id === experiment?.id);
    if (index >= 0) {
        experiments[index] = { ...experiments[index], ...experiment };
    } else {
        experiments.unshift(experiment);
    }
    return experiments.slice(0, 300);
};

class StorageService {
    constructor() {
        this.storageMode = STORAGE_MODES.FIREBASE;
        this.modeListeners = new Set();
        this.hasLoggedMongoFallback = false;
    }

    subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        this.modeListeners.add(listener);
        return () => this.modeListeners.delete(listener);
    }

    notifyModeChange() {
        this.modeListeners.forEach((listener) => {
            try {
                listener(this.storageMode);
            } catch {
                // ignore listener failures
            }
        });
    }

    getStorageMode() {
        return this.storageMode;
    }

    setStorageMode(mode) {
        const normalized = mode === STORAGE_MODES.LOCAL ? STORAGE_MODES.LOCAL : STORAGE_MODES.FIREBASE;
        if (this.storageMode === normalized) return;
        this.storageMode = normalized;
        if (normalized === STORAGE_MODES.LOCAL && !this.hasLoggedMongoFallback) {
            // eslint-disable-next-line no-console
            console.warn(MODE_SWITCH_MESSAGE);
            this.hasLoggedMongoFallback = true;
        }
        this.notifyModeChange();
    }

    shouldFallback(error) {
        if (!error) return false;
        const code = error?.code || error?.name || '';
        if (code === 'permission-denied' || code === 'unauthenticated') return true;
        if (code === 'unavailable' || code === 'failed-precondition' || code === 'resource-exhausted') return true;
        if (code === 'cancelled' || code === 'aborted' || code === 'internal') return true;
        return true;
    }

    dedupeWrite(key, task) {
        const existing = inFlightWrites.get(key);
        if (existing) return existing;

        const promise = (async () => {
            try {
                return await task();
            } finally {
                inFlightWrites.delete(key);
            }
        })();

        inFlightWrites.set(key, promise);
        return promise;
    }

    safeParse(raw, fallback) {
        if (!raw) return fallback;
        try {
            const parsed = JSON.parse(raw);
            return parsed ?? fallback;
        } catch {
            return fallback;
        }
    }

    readMap(key) {
        const value = this.safeParse(safeLocalStorage.getItem(key), {});
        if (!value || typeof value !== 'object') return { byEmail: {} };
        const byEmail = value.byEmail && typeof value.byEmail === 'object' ? value.byEmail : {};
        return { byEmail };
    }

    writeMap(key, mapValue) {
        const payload = { byEmail: mapValue?.byEmail && typeof mapValue.byEmail === 'object' ? mapValue.byEmail : {} };
        safeLocalStorage.setItem(key, JSON.stringify(payload));
    }

    mergeLocalUser(email) {
        const userMap = this.readMap(LOCAL_KEYS.user);
        const settingsMap = this.readMap(LOCAL_KEYS.settings);
        const labMap = this.readMap(LOCAL_KEYS.labState);
        const historyMap = this.readMap(LOCAL_KEYS.aiHistory);
        const experimentsMap = this.readMap(LOCAL_KEYS.experiments);

        const base = userMap.byEmail[email];
        if (!base) return null;

        const merged = {
            ...base,
            email,
            settings: {
                ...(base.settings || {}),
                ...(settingsMap.byEmail[email] || {})
            },
            currentLabState: labMap.byEmail[email] || base.currentLabState || null,
            aiHistory: Array.isArray(historyMap.byEmail[email]) ? historyMap.byEmail[email] : (Array.isArray(base.aiHistory) ? base.aiHistory : []),
            experiments: Array.isArray(experimentsMap.byEmail[email]) ? experimentsMap.byEmail[email] : (Array.isArray(base.experiments) ? base.experiments : [])
        };

        return merged;
    }

    saveLocalUserRecord(email, partial = {}) {
        const userMap = this.readMap(LOCAL_KEYS.user);
        const current = userMap.byEmail[email] || {
            email,
            name: '',
            role: 'student',
            level: 1,
            xp: 0,
            badges: [],
            currentLabState: null,
            aiHistory: [],
            settings: {}
        };

        userMap.byEmail[email] = {
            ...current,
            ...partial,
            email,
            badges: Array.isArray(partial.badges) ? partial.badges : (Array.isArray(current.badges) ? current.badges : [])
        };
        this.writeMap(LOCAL_KEYS.user, userMap);
        return userMap.byEmail[email];
    }

    saveLocalSettings(email, settings = {}) {
        const settingsMap = this.readMap(LOCAL_KEYS.settings);
        const merged = {
            ...(settingsMap.byEmail[email] || {}),
            ...(settings || {})
        };
        settingsMap.byEmail[email] = merged;
        this.writeMap(LOCAL_KEYS.settings, settingsMap);

        this.saveLocalUserRecord(email, { settings: merged });
        return merged;
    }

    saveLocalLabState(email, labState) {
        const labMap = this.readMap(LOCAL_KEYS.labState);
        labMap.byEmail[email] = labState || null;
        this.writeMap(LOCAL_KEYS.labState, labMap);
        this.saveLocalUserRecord(email, { currentLabState: labState || null });
        return labMap.byEmail[email];
    }

    saveLocalAIHistory(email, entry) {
        const historyMap = this.readMap(LOCAL_KEYS.aiHistory);
        const current = Array.isArray(historyMap.byEmail[email]) ? historyMap.byEmail[email] : [];
        const next = [entry, ...current].slice(0, 50);
        historyMap.byEmail[email] = next;
        this.writeMap(LOCAL_KEYS.aiHistory, historyMap);
        this.saveLocalUserRecord(email, { aiHistory: next });
        return next;
    }

    saveLocalExperiments(email, experiments = []) {
        const experimentsMap = this.readMap(LOCAL_KEYS.experiments);
        const safeExperiments = Array.isArray(experiments) ? experiments.slice(0, 300) : [];
        experimentsMap.byEmail[email] = safeExperiments;
        this.writeMap(LOCAL_KEYS.experiments, experimentsMap);
        this.saveLocalUserRecord(email, { experiments: safeExperiments });
        return safeExperiments;
    }

    upsertLocalExperiment(email, experiment = {}) {
        const experimentsMap = this.readMap(LOCAL_KEYS.experiments);
        const current = Array.isArray(experimentsMap.byEmail[email]) ? [...experimentsMap.byEmail[email]] : [];
        const index = current.findIndex((item) => item?.id === experiment?.id);
        if (index >= 0) {
            current[index] = { ...current[index], ...experiment };
        } else {
            current.unshift(experiment);
        }
        return this.saveLocalExperiments(email, current);
    }

    updateLocalExperimentProgress(email, experimentId, progress = {}) {
        const experimentsMap = this.readMap(LOCAL_KEYS.experiments);
        const current = Array.isArray(experimentsMap.byEmail[email]) ? [...experimentsMap.byEmail[email]] : [];
        const index = current.findIndex((item) => item?.id === experimentId);
        if (index < 0) return this.saveLocalExperiments(email, current);
        current[index] = {
            ...current[index],
            progress: {
                ...(current[index]?.progress || {}),
                ...(progress || {})
            }
        };
        return this.saveLocalExperiments(email, current);
    }

    getAuthIdentity(email) {
        const normalizedEmail = normalizeEmail(email);
        const currentUser = auth?.currentUser || null;
        const resolvedEmail = normalizedEmail || normalizeEmail(currentUser?.email);
        const uid = currentUser?.uid || '';
        return { uid, email: resolvedEmail };
    }

    canUseFirebase(uid) {
        if (this.storageMode === STORAGE_MODES.LOCAL) return false;
        if (!isFirebaseConfigured()) return false;
        if (!db) return false;
        return !!uid;
    }

    syncLocalFromUser(normalizedEmail, user) {
        if (!user || !normalizedEmail) return;
        this.saveLocalUserRecord(normalizedEmail, user);
        if (user.settings) this.saveLocalSettings(normalizedEmail, user.settings);
        if (user.currentLabState !== undefined) this.saveLocalLabState(normalizedEmail, user.currentLabState);
        if (Array.isArray(user.aiHistory)) {
            const historyMap = this.readMap(LOCAL_KEYS.aiHistory);
            historyMap.byEmail[normalizedEmail] = user.aiHistory.slice(0, 50);
            this.writeMap(LOCAL_KEYS.aiHistory, historyMap);
        }
        if (Array.isArray(user.experiments)) {
            this.saveLocalExperiments(normalizedEmail, user.experiments);
        }
    }

    async loadFirebaseUser(uid, email) {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const data = snap.data();
        return { ref, data, user: normalizeUserRecord(data, email, uid) };
    }

    async ensureFirebaseUser(uid, email, name = '') {
        const existing = await this.loadFirebaseUser(uid, email);
        if (existing) return existing;

        const record = buildUserRecord({ uid, email, name });
        const ref = doc(db, 'users', uid);
        await setDoc(ref, record);
        await this.ensureLeagueRecord(uid, record.user.name || name || email);
        return { ref, data: record, user: normalizeUserRecord(record, email, uid) };
    }

    async ensureLeagueRecord(uid, nameFallback = '') {
        if (!uid || !db) return;
        const leagueRef = doc(db, 'league_scores', uid);
        const leagueSnap = await getDoc(leagueRef);
        if (leagueSnap.exists()) return;

        const currentUser = auth?.currentUser || null;
        const userName = String(nameFallback || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student').trim() || 'Student';
        await setDoc(leagueRef, {
            userId: uid,
            userName,
            totalExperiments: 0,
            totalScore: 0,
            averageAccuracy: 0,
            lastExperiment: '',
            lastUpdated: new Date()
        }, { merge: true });
    }

    async getUser(email) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        if (!normalizedEmail) return { user: null, source: 'local', storageMode: this.storageMode };

        if (this.canUseFirebase(uid)) {
            try {
                const record = await this.loadFirebaseUser(uid, normalizedEmail);
                if (!record) {
                    this.setStorageMode(STORAGE_MODES.FIREBASE);
                    return { user: null, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                }
                this.setStorageMode(STORAGE_MODES.FIREBASE);
                await this.ensureLeagueRecord(uid, record.user?.name || normalizedEmail);
                this.syncLocalFromUser(normalizedEmail, record.user);
                return { user: record.user, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
            } catch (error) {
                if (!this.shouldFallback(error)) throw new Error(error?.message || 'Failed to load user');
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }
        } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
            this.setStorageMode(STORAGE_MODES.LOCAL);
        }

        const localUser = this.mergeLocalUser(normalizedEmail);
        return { user: localUser, source: 'local', storageMode: STORAGE_MODES.LOCAL };
    }

    async saveUser({ email, name = '' }) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        const safeName = String(name || '').trim();
        if (!normalizedEmail) throw new Error('Valid email is required.');

        const writeKey = `saveUser:${uid || 'local'}:${normalizedEmail}:${safeName}`;
        return this.dedupeWrite(writeKey, async () => {
            if (this.canUseFirebase(uid)) {
                try {
                    const record = await this.ensureFirebaseUser(uid, normalizedEmail, safeName);
                    this.setStorageMode(STORAGE_MODES.FIREBASE);
                    this.syncLocalFromUser(normalizedEmail, record.user);
                    return { user: record.user, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                } catch (error) {
                    if (!this.shouldFallback(error)) throw new Error(error?.message || 'Failed to save user');
                    this.setStorageMode(STORAGE_MODES.LOCAL);
                }
            } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }

            const user = this.saveLocalUserRecord(normalizedEmail, { name: safeName });
            return { user: this.mergeLocalUser(normalizedEmail) || user, source: 'local', storageMode: STORAGE_MODES.LOCAL };
        });
    }

    async updateUserProfile({ email, name, settings }) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        if (!normalizedEmail) return { ok: false, source: 'local', storageMode: this.storageMode };

        const payload = {
            name: typeof name === 'string' ? name.trim() : undefined,
            settings: settings && typeof settings === 'object' ? sanitizeSettings(settings) : undefined
        };

        const writeKey = `updateUser:${uid || 'local'}:${normalizedEmail}:${JSON.stringify(payload)}`;
        return this.dedupeWrite(writeKey, async () => {
            if (this.canUseFirebase(uid)) {
                try {
                    const updatePayload = {
                        updatedAt: new Date()
                    };
                    if (payload.name !== undefined) updatePayload.name = payload.name;
                    if (payload.settings !== undefined) updatePayload.settings = payload.settings;

                    await setDoc(doc(db, 'users', uid), updatePayload, { merge: true });

                    this.setStorageMode(STORAGE_MODES.FIREBASE);
                    if (payload.name !== undefined || payload.settings !== undefined) {
                        this.saveLocalUserRecord(normalizedEmail, {
                            name: payload.name,
                            settings: payload.settings
                        });
                        if (payload.settings !== undefined) this.saveLocalSettings(normalizedEmail, payload.settings);
                    }
                    if (payload.name) {
                        await setDoc(doc(db, 'league_scores', uid), {
                            userId: uid,
                            userName: payload.name
                        }, { merge: true });
                    }
                    return { ok: true, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                } catch (error) {
                    if (!this.shouldFallback(error)) {
                        return { ok: false, error: error?.message || 'Failed to update user', source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                    }
                    this.setStorageMode(STORAGE_MODES.LOCAL);
                }
            } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }

            if (payload.name !== undefined || payload.settings !== undefined) {
                this.saveLocalUserRecord(normalizedEmail, {
                    name: payload.name,
                    settings: payload.settings
                });
                if (payload.settings !== undefined) this.saveLocalSettings(normalizedEmail, payload.settings);
            }
            return { ok: true, user: this.mergeLocalUser(normalizedEmail), source: 'local', storageMode: STORAGE_MODES.LOCAL };
        });
    }

    async updateSettings({ email, settings }) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        if (!normalizedEmail) return { ok: false, source: 'local', storageMode: this.storageMode };

        const payload = settings && typeof settings === 'object' ? sanitizeSettings(settings) : {};
        const writeKey = `updateSettings:${uid || 'local'}:${normalizedEmail}:${JSON.stringify(payload)}`;
        return this.dedupeWrite(writeKey, async () => {
            if (this.canUseFirebase(uid)) {
                try {
                    await setDoc(doc(db, 'users', uid), {
                        settings: payload,
                        updatedAt: new Date()
                    }, { merge: true });

                    this.setStorageMode(STORAGE_MODES.FIREBASE);
                    this.saveLocalSettings(normalizedEmail, payload);
                    return { ok: true, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                } catch (error) {
                    if (!this.shouldFallback(error)) return { ok: false, error: error?.message || 'Failed to update settings', source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                    this.setStorageMode(STORAGE_MODES.LOCAL);
                }
            } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }

            this.saveLocalSettings(normalizedEmail, payload);
            return { ok: true, source: 'local', storageMode: STORAGE_MODES.LOCAL };
        });
    }

    async saveLabState({ email, labState }) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        if (!normalizedEmail) return { ok: false, source: 'local', storageMode: this.storageMode };

        const sanitizedLab = sanitizeLabState(labState);
        const writeKey = `saveLab:${uid || 'local'}:${normalizedEmail}:${JSON.stringify(sanitizedLab || {})}`;
        return this.dedupeWrite(writeKey, async () => {
            if (this.canUseFirebase(uid)) {
                try {
                    await setDoc(doc(db, 'users', uid), {
                        currentLabState: sanitizedLab,
                        updatedAt: new Date()
                    }, { merge: true });

                    this.setStorageMode(STORAGE_MODES.FIREBASE);
                    this.saveLocalLabState(normalizedEmail, sanitizedLab);
                    return { ok: true, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                } catch (error) {
                    if (!this.shouldFallback(error)) return { ok: false, error: error?.message || 'Failed to save lab state', source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                    this.setStorageMode(STORAGE_MODES.LOCAL);
                }
            } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }

            this.saveLocalLabState(normalizedEmail, sanitizedLab);
            return { ok: true, source: 'local', storageMode: STORAGE_MODES.LOCAL };
        });
    }

    async saveAIHistory({ email, question, answer }) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        const safeQuestion = String(question || '').trim();
        const safeAnswer = String(answer || '').trim();
        if (!normalizedEmail || !safeQuestion || !safeAnswer) return { ok: false, source: 'local', storageMode: this.storageMode };

        const entry = {
            question: safeQuestion,
            answer: safeAnswer,
            createdAt: new Date().toISOString()
        };

        const writeKey = `saveAIHistory:${uid || 'local'}:${normalizedEmail}:${safeQuestion}:${safeAnswer.slice(0, 120)}`;
        return this.dedupeWrite(writeKey, async () => {
            if (this.canUseFirebase(uid)) {
                try {
                    const record = await this.ensureFirebaseUser(uid, normalizedEmail);
                    const nextHistory = [entry, ...(Array.isArray(record.user.aiHistory) ? record.user.aiHistory : [])].slice(0, 50);
                    await updateDoc(record.ref, {
                        aiHistory: nextHistory,
                        updatedAt: new Date()
                    });

                    this.setStorageMode(STORAGE_MODES.FIREBASE);
                    this.saveLocalAIHistory(normalizedEmail, entry);
                    return { ok: true, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                } catch (error) {
                    if (!this.shouldFallback(error)) return { ok: false, error: error?.message || 'Failed to save AI history', source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                    this.setStorageMode(STORAGE_MODES.LOCAL);
                }
            } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }

            this.saveLocalAIHistory(normalizedEmail, entry);
            return { ok: true, source: 'local', storageMode: STORAGE_MODES.LOCAL };
        });
    }

    async addXP({ email, amount }) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        const safeAmount = Number(amount);
        if (!normalizedEmail || !Number.isFinite(safeAmount) || safeAmount <= 0) {
            return { ok: false, source: 'local', storageMode: this.storageMode };
        }

        const writeKey = `addXP:${uid || 'local'}:${normalizedEmail}:${safeAmount}`;
        return this.dedupeWrite(writeKey, async () => {
            if (this.canUseFirebase(uid)) {
                try {
                    const record = await this.ensureFirebaseUser(uid, normalizedEmail);
                    const currentXP = Number(record.user.xp) || 0;
                    const nextXP = currentXP + safeAmount;
                    const nextLevel = Math.floor(nextXP / 100) + 1;

                    await updateDoc(record.ref, {
                        xp: nextXP,
                        level: nextLevel,
                        updatedAt: new Date()
                    });

                    this.setStorageMode(STORAGE_MODES.FIREBASE);
                    const localUser = this.saveLocalUserRecord(normalizedEmail, {
                        xp: nextXP,
                        level: nextLevel
                    });
                    return { ok: true, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE, user: localUser };
                } catch (error) {
                    if (!this.shouldFallback(error)) return { ok: false, error: error?.message || 'Failed to add XP', source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                    this.setStorageMode(STORAGE_MODES.LOCAL);
                }
            } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }

            const localUser = this.mergeLocalUser(normalizedEmail) || this.saveLocalUserRecord(normalizedEmail, {});
            const nextXP = (Number(localUser.xp) || 0) + safeAmount;
            const nextLevel = Math.floor(nextXP / 100) + 1;
            this.saveLocalUserRecord(normalizedEmail, { xp: nextXP, level: nextLevel });
            return { ok: true, source: 'local', storageMode: STORAGE_MODES.LOCAL, user: this.mergeLocalUser(normalizedEmail) };
        });
    }

    async getExperiments(email) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        if (!normalizedEmail) return { experiments: [], source: 'local', storageMode: this.storageMode };

        if (this.canUseFirebase(uid)) {
            try {
                const record = await this.loadFirebaseUser(uid, normalizedEmail);
                const experiments = Array.isArray(record?.user?.experiments) ? record.user.experiments : [];
                this.setStorageMode(STORAGE_MODES.FIREBASE);
                this.saveLocalExperiments(normalizedEmail, experiments);
                return { experiments, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
            } catch (error) {
                if (!this.shouldFallback(error)) throw new Error(error?.message || 'Failed to load experiments');
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }
        } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
            this.setStorageMode(STORAGE_MODES.LOCAL);
        }

        const experimentsMap = this.readMap(LOCAL_KEYS.experiments);
        const experiments = Array.isArray(experimentsMap.byEmail[normalizedEmail]) ? experimentsMap.byEmail[normalizedEmail] : [];
        return { experiments, source: 'local', storageMode: STORAGE_MODES.LOCAL };
    }

    async saveExperiment({ email, experiment }) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        if (!normalizedEmail || !experiment || typeof experiment !== 'object') {
            return { ok: false, source: 'local', storageMode: this.storageMode };
        }

        const writeKey = `saveExperiment:${uid || 'local'}:${normalizedEmail}:${JSON.stringify(experiment || {})}`;
        return this.dedupeWrite(writeKey, async () => {
            if (this.canUseFirebase(uid)) {
                try {
                    const record = await this.ensureFirebaseUser(uid, normalizedEmail);
                    const nextExperiments = upsertExperiment(record.user.experiments, experiment);
                    await updateDoc(record.ref, {
                        experiments: nextExperiments,
                        updatedAt: new Date()
                    });

                    this.setStorageMode(STORAGE_MODES.FIREBASE);
                    this.upsertLocalExperiment(normalizedEmail, experiment);
                    return { ok: true, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                } catch (error) {
                    if (!this.shouldFallback(error)) return { ok: false, error: error?.message || 'Failed to save experiment', source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                    this.setStorageMode(STORAGE_MODES.LOCAL);
                }
            } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }

            this.upsertLocalExperiment(normalizedEmail, experiment);
            return { ok: true, source: 'local', storageMode: STORAGE_MODES.LOCAL };
        });
    }

    async updateExperimentProgress({ email, experimentId, progress }) {
        const { uid, email: normalizedEmail } = this.getAuthIdentity(email);
        if (!normalizedEmail || !experimentId) {
            return { ok: false, source: 'local', storageMode: this.storageMode };
        }

        const writeKey = `saveExperimentProgress:${uid || 'local'}:${normalizedEmail}:${experimentId}:${JSON.stringify(progress || {})}`;
        return this.dedupeWrite(writeKey, async () => {
            if (this.canUseFirebase(uid)) {
                try {
                    const record = await this.ensureFirebaseUser(uid, normalizedEmail);
                    const nextExperiments = upsertExperiment(record.user.experiments, {
                        id: experimentId,
                        progress: {
                            ...(record.user.experiments?.find((item) => item?.id === experimentId)?.progress || {}),
                            ...(progress || {})
                        }
                    });

                    await updateDoc(record.ref, {
                        experiments: nextExperiments,
                        updatedAt: new Date()
                    });

                    this.setStorageMode(STORAGE_MODES.FIREBASE);
                    this.updateLocalExperimentProgress(normalizedEmail, experimentId, progress);
                    return { ok: true, source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                } catch (error) {
                    if (!this.shouldFallback(error)) return { ok: false, error: error?.message || 'Failed to save progress', source: 'firebase', storageMode: STORAGE_MODES.FIREBASE };
                    this.setStorageMode(STORAGE_MODES.LOCAL);
                }
            } else if (this.storageMode !== STORAGE_MODES.LOCAL) {
                this.setStorageMode(STORAGE_MODES.LOCAL);
            }

            this.updateLocalExperimentProgress(normalizedEmail, experimentId, progress);
            return { ok: true, source: 'local', storageMode: STORAGE_MODES.LOCAL };
        });
    }

    clearUser(email) {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
            Object.values(LOCAL_KEYS).forEach((key) => safeLocalStorage.removeItem(key));
            this.setStorageMode(STORAGE_MODES.FIREBASE);
            return;
        }

        [LOCAL_KEYS.user, LOCAL_KEYS.settings, LOCAL_KEYS.labState, LOCAL_KEYS.aiHistory, LOCAL_KEYS.experiments].forEach((key) => {
            const map = this.readMap(key);
            if (map.byEmail[normalizedEmail]) {
                delete map.byEmail[normalizedEmail];
                this.writeMap(key, map);
            }
        });
    }
}

export const storageService = new StorageService();
export default storageService;
