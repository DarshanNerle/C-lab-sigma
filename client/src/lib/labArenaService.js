import { arrayRemove, arrayUnion, collection, doc, getDoc, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { REACTION_RULES } from '../constants/chemistryData';
import { safeLocalStorage } from '../utils/safeStorage';

const ROOM_COLLECTION = 'lab_arena_rooms';
const INVITE_COLLECTION = 'lab_arena_invites';

const LOCAL_KEYS = {
    rooms: 'clab_arena_rooms',
    invites: 'clab_arena_invites',
    userCache: 'app_user'
};

const DEFAULT_PACK_SIZE = 3;
const MAX_PACK_SIZE = 5;
const MAX_CAPACITY = 6;
const MIN_CAPACITY = 1;

const featuredReactionIds = ['n1', 'n2', 'p1', 'p2', 'g1', 'g2', 'r1', 'r4', 'r6', 'p5', 'n4', 'g4'];
const reactionCatalog = REACTION_RULES
    .filter((rule) => !String(rule.id || '').startsWith('auto_gen_'))
    .map((rule) => ({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        equation: rule.equation,
        xp: Number(rule.xp) || 0,
        reactants: Array.isArray(rule.reactants) ? rule.reactants : []
    }));

const reactionLookup = new Map(reactionCatalog.map((reaction) => [reaction.id, reaction]));

const nowIso = () => new Date().toISOString();

const makeId = (prefix) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const safeParse = (raw, fallback) => {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

const readMap = (key) => {
    const raw = safeParse(safeLocalStorage.getItem(key), {});
    if (!raw || typeof raw !== 'object') return {};
    return raw;
};

const writeMap = (key, value) => {
    safeLocalStorage.setItem(key, JSON.stringify(value || {}));
};

const getUserAliases = (user) => {
    const aliases = [user?.uid, String(user?.email || '').trim().toLowerCase()].filter(Boolean);
    return [...new Set(aliases)];
};

const normalizeTimeValue = (value) => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizeRoom = (room, fallbackId = '') => {
    if (!room || typeof room !== 'object') return null;
    const members = room.members && typeof room.members === 'object' ? room.members : {};
    return {
        id: room.id || fallbackId,
        title: String(room.title || 'Lab Arena Room'),
        mode: room.mode === 'squad' || room.mode === 'solo' ? room.mode : 'versus',
        privacy: room.privacy === 'public' ? 'public' : 'invite',
        capacity: Math.max(MIN_CAPACITY, Math.min(MAX_CAPACITY, Number(room.capacity) || 2)),
        minMembers: Math.max(1, Number(room.minMembers) || 1),
        ownerId: String(room.ownerId || ''),
        ownerName: String(room.ownerName || 'Scientist'),
        ownerEmail: String(room.ownerEmail || ''),
        memberIds: Array.isArray(room.memberIds) ? room.memberIds.filter(Boolean) : [],
        members,
        experimentPack: Array.isArray(room.experimentPack) ? room.experimentPack : [],
        inviteUserIds: Array.isArray(room.inviteUserIds) ? room.inviteUserIds.filter(Boolean) : [],
        status: room.status === 'active' || room.status === 'completed' ? room.status : 'forming',
        winnerId: String(room.winnerId || ''),
        roomScore: Number(room.roomScore) || 0,
        createdAt: normalizeTimeValue(room.createdAt) || nowIso(),
        updatedAt: normalizeTimeValue(room.updatedAt) || normalizeTimeValue(room.createdAt) || nowIso(),
        startedAt: normalizeTimeValue(room.startedAt),
        completedAt: normalizeTimeValue(room.completedAt)
    };
};

const normalizeInvite = (invite, fallbackId = '') => {
    if (!invite || typeof invite !== 'object') return null;
    return {
        id: invite.id || fallbackId,
        roomId: String(invite.roomId || ''),
        roomTitle: String(invite.roomTitle || 'Lab Arena Room'),
        roomMode: invite.roomMode === 'squad' || invite.roomMode === 'solo' ? invite.roomMode : 'versus',
        requestKind: invite.requestKind === 'join_request' ? 'join_request' : 'invite',
        fromUserId: String(invite.fromUserId || ''),
        fromUserName: String(invite.fromUserName || 'Scientist'),
        fromUserEmail: String(invite.fromUserEmail || ''),
        toUserId: String(invite.toUserId || ''),
        toUserName: String(invite.toUserName || 'Scientist'),
        toUserEmail: String(invite.toUserEmail || ''),
        status: invite.status === 'accepted' || invite.status === 'declined' || invite.status === 'cancelled' ? invite.status : 'pending',
        experimentPack: Array.isArray(invite.experimentPack) ? invite.experimentPack : [],
        createdAt: normalizeTimeValue(invite.createdAt) || nowIso(),
        updatedAt: normalizeTimeValue(invite.updatedAt) || normalizeTimeValue(invite.createdAt) || nowIso()
    };
};

const buildActorProfile = (user, profile = null) => {
    if (!user?.uid) {
        throw new Error('Please sign in to use Lab Arena.');
    }
    const email = String(user.email || '').trim().toLowerCase();
    const rawName = profile?.name || user.displayName || email.split('@')[0] || 'Scientist';
    return {
        userId: user.uid,
        email,
        name: String(rawName).trim() || 'Scientist',
        avatarSeed: String(rawName || email || user.uid)
    };
};

const createMemberState = (actor, role = 'member') => ({
    userId: actor.userId,
    name: actor.name,
    email: actor.email,
    avatarSeed: actor.avatarSeed,
    role,
    ready: role === 'owner' && false,
    status: 'forming',
    score: 0,
    completedTargets: [],
    reactionHits: 0,
    actionCount: 0,
    bonusXpEarned: 0,
    finishTimeMs: null,
    joinedAt: nowIso(),
    updatedAt: nowIso()
});

const sumRoomScore = (members = {}) => Object.values(members).reduce((total, member) => total + (Number(member?.score) || 0), 0);

const clampCapacity = (value, mode = 'versus') => {
    const floor = mode === 'solo' ? 1 : 2;
    return Math.max(floor, Math.min(MAX_CAPACITY, Number(value) || floor));
};

const pickReactionPack = (selectedIds = [], requestedSize = DEFAULT_PACK_SIZE) => {
    const size = Math.max(1, Math.min(MAX_PACK_SIZE, Number(requestedSize) || DEFAULT_PACK_SIZE));
    const uniqueIds = [...new Set((Array.isArray(selectedIds) ? selectedIds : []).filter((id) => reactionLookup.has(id)))];
    const fallbackIds = featuredReactionIds.filter((id) => reactionLookup.has(id) && !uniqueIds.includes(id));
    const finalIds = [...uniqueIds, ...fallbackIds].slice(0, size);
    return finalIds.map((id) => reactionLookup.get(id)).filter(Boolean);
};

const isFirebaseArenaAvailable = () => {
    const apiKey = auth?.app?.options?.apiKey;
    if (!auth?.currentUser?.uid || !db || !apiKey) return false;
    const raw = String(apiKey);
    return !!raw && !raw.includes('undefined') && !raw.includes('FIREBASE_API_KEY');
};

const normalizeUsersFromCache = () => {
    const raw = safeParse(safeLocalStorage.getItem(LOCAL_KEYS.userCache), {});
    const byEmail = raw?.byEmail && typeof raw.byEmail === 'object' ? raw.byEmail : {};
    return Object.values(byEmail)
        .map((entry) => {
            const email = String(entry?.email || '').trim().toLowerCase();
            if (!email) return null;
            const label = String(entry?.name || email.split('@')[0] || 'Scientist').trim() || 'Scientist';
            return {
                userId: String(entry?.userId || email),
                email,
                name: label,
                searchLabel: `${label} ${email}`.toLowerCase()
            };
        })
        .filter(Boolean);
};

const localArenaStore = {
    readRooms() {
        return Object.entries(readMap(LOCAL_KEYS.rooms))
            .map(([id, value]) => normalizeRoom(value, id))
            .filter(Boolean)
            .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    },
    readInvites() {
        return Object.entries(readMap(LOCAL_KEYS.invites))
            .map(([id, value]) => normalizeInvite(value, id))
            .filter(Boolean)
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    },
    saveRoom(room) {
        const rooms = readMap(LOCAL_KEYS.rooms);
        rooms[room.id] = room;
        writeMap(LOCAL_KEYS.rooms, rooms);
        return normalizeRoom(room, room.id);
    },
    saveInvite(invite) {
        const invites = readMap(LOCAL_KEYS.invites);
        invites[invite.id] = invite;
        writeMap(LOCAL_KEYS.invites, invites);
        return normalizeInvite(invite, invite.id);
    }
};

const mergeInvites = (incoming = [], outgoing = []) => {
    const map = new Map();
    [...incoming, ...outgoing].forEach((invite) => {
        if (!invite?.id) return;
        map.set(invite.id, invite);
    });
    return [...map.values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
};

export const labArenaService = {
    getReactionCatalog() {
        return reactionCatalog;
    },

    getReactionPresets() {
        return [
            {
                id: 'starter-duel',
                label: 'Starter Duel',
                description: 'Fast neutralization and gas-evolution set for quick matches.',
                reactionIds: ['n1', 'g4', 'p1']
            },
            {
                id: 'precision-pack',
                label: 'Precision Pack',
                description: 'Accuracy-first room with precipitation and acid-base targets.',
                reactionIds: ['p2', 'n2', 'p5']
            },
            {
                id: 'research-rush',
                label: 'Research Rush',
                description: 'Higher-xp reactions for advanced competitive labs.',
                reactionIds: ['r1', 'r4', 'r6', 'p2']
            }
        ];
    },

    buildRoomDraft({ actor, title, mode, privacy, capacity, experimentIds }) {
        const roomMode = mode === 'solo' || mode === 'squad' ? mode : 'versus';
        const pack = pickReactionPack(experimentIds, roomMode === 'solo' ? 2 : DEFAULT_PACK_SIZE);
        const ownerMember = createMemberState(actor, 'owner');
        return {
            id: makeId('room'),
            title: String(title || '').trim() || `${actor.name}'s ${roomMode === 'squad' ? 'Squad' : roomMode === 'solo' ? 'Solo' : 'Arena'} Room`,
            mode: roomMode,
            privacy: privacy === 'public' ? 'public' : 'invite',
            capacity: clampCapacity(capacity, roomMode),
            minMembers: roomMode === 'solo' ? 1 : 2,
            ownerId: actor.userId,
            ownerName: actor.name,
            ownerEmail: actor.email,
            memberIds: [actor.userId],
            members: {
                [actor.userId]: ownerMember
            },
            experimentPack: pack,
            inviteUserIds: [],
            status: 'forming',
            winnerId: '',
            roomScore: 0,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            startedAt: null,
            completedAt: null
        };
    },

    subscribeArena({ user, onUsers, onRooms, onInvites, onMode, onError }) {
        if (!user?.uid) return () => {};

        if (!isFirebaseArenaAvailable()) {
            onMode?.('offline');
            onError?.({ message: 'Arena needs a live Firebase connection and deployed Firestore rules.' });
            return () => {};
        }

        onMode?.('online');
        let incomingInvites = [];
        let outgoingInvites = [];
        let unsubUsers = () => {};
        let unsubRooms = () => {};
        let unsubIncoming = () => {};
        let unsubOutgoing = () => {};

        const emitInvites = () => onInvites?.(mergeInvites(incomingInvites, outgoingInvites));

        unsubUsers = onSnapshot(
            collection(db, 'users'),
            (snapshot) => {
                const users = snapshot.docs.map((entry) => {
                    const data = entry.data();
                    const email = String(data?.email || '').trim().toLowerCase();
                    const label = String(data?.name || data?.displayName || email.split('@')[0] || 'Scientist').trim() || 'Scientist';
                    return {
                        userId: entry.id,
                        email,
                        name: label,
                        searchLabel: `${label} ${email}`.toLowerCase()
                    };
                });
                onUsers?.(users);
            },
            (error) => onError?.(error)
        );

        unsubRooms = onSnapshot(
            collection(db, ROOM_COLLECTION),
            (snapshot) => {
                const rooms = snapshot.docs
                    .map((entry) => normalizeRoom({ id: entry.id, ...entry.data() }, entry.id))
                    .filter(Boolean);
                onRooms?.(rooms);
            },
            (error) => onError?.(error)
        );

        unsubIncoming = onSnapshot(
            query(collection(db, INVITE_COLLECTION), where('toUserId', '==', user.uid)),
            (snapshot) => {
                incomingInvites = snapshot.docs
                    .map((entry) => normalizeInvite({ id: entry.id, ...entry.data() }, entry.id))
                    .filter(Boolean);
                emitInvites();
            },
            (error) => onError?.(error)
        );

        unsubOutgoing = onSnapshot(
            query(collection(db, INVITE_COLLECTION), where('fromUserId', '==', user.uid)),
            (snapshot) => {
                outgoingInvites = snapshot.docs
                    .map((entry) => normalizeInvite({ id: entry.id, ...entry.data() }, entry.id))
                    .filter(Boolean);
                emitInvites();
            },
            (error) => onError?.(error)
        );

        return () => {
            unsubUsers();
            unsubRooms();
            unsubIncoming();
            unsubOutgoing();
        };
    },

    async createRoom({ user, profile, title, mode, privacy, capacity, experimentIds }) {
        const actor = buildActorProfile(user, profile);
        const room = this.buildRoomDraft({ actor, title, mode, privacy, capacity, experimentIds });

        if (!isFirebaseArenaAvailable()) {
            throw new Error('Arena requires a live Firebase connection.');
        }

        await setDoc(doc(db, ROOM_COLLECTION, room.id), room);
        return room;
    },

    async sendInvite({ user, profile, room, targetUser }) {
        const actor = buildActorProfile(user, profile);
        if (!room?.id) throw new Error('Choose a room before inviting a player.');
        if (!targetUser?.userId) throw new Error('Choose a valid player.');
        if (targetUser.userId === actor.userId) throw new Error('You are already in this room.');
        if (Array.isArray(room.memberIds) && room.memberIds.includes(targetUser.userId)) {
            throw new Error('That player is already in the room.');
        }
        if (Array.isArray(room.inviteUserIds) && room.inviteUserIds.includes(targetUser.userId)) {
            throw new Error('Invite already sent to that player.');
        }

        const invite = {
            id: makeId('invite'),
            roomId: room.id,
            roomTitle: room.title,
            roomMode: room.mode,
            requestKind: 'invite',
            fromUserId: actor.userId,
            fromUserName: actor.name,
            fromUserEmail: actor.email,
            toUserId: targetUser.userId,
            toUserName: targetUser.name,
            toUserEmail: targetUser.email,
            status: 'pending',
            experimentPack: Array.isArray(room.experimentPack) ? room.experimentPack.slice(0, 3) : [],
            createdAt: nowIso(),
            updatedAt: nowIso()
        };

        if (!isFirebaseArenaAvailable()) {
            throw new Error('Arena requires a live Firebase connection.');
        }

        await setDoc(doc(db, INVITE_COLLECTION, invite.id), invite);
        await updateDoc(doc(db, ROOM_COLLECTION, room.id), {
            inviteUserIds: arrayUnion(targetUser.userId),
            updatedAt: nowIso()
        });
        return invite;
    },

    async requestToJoinPublicRoom({ user, profile, room }) {
        const actor = buildActorProfile(user, profile);
        if (!room?.id) throw new Error('Choose a public room first.');
        if (room.privacy !== 'public') throw new Error('This room is not open for public requests.');
        if (room.ownerId === actor.userId) throw new Error('You already own this room.');
        if ((room.memberIds || []).includes(actor.userId)) throw new Error('You are already a member of this room.');
        if ((room.inviteUserIds || []).includes(actor.userId)) throw new Error('A join request is already pending for this room.');
        if (room.status !== 'forming') throw new Error('This room is no longer accepting new members.');

        if (!isFirebaseArenaAvailable()) {
            throw new Error('Arena requires a live Firebase connection.');
        }

        const joinRequest = {
            id: makeId('invite'),
            roomId: room.id,
            roomTitle: room.title,
            roomMode: room.mode,
            requestKind: 'join_request',
            fromUserId: actor.userId,
            fromUserName: actor.name,
            fromUserEmail: actor.email,
            toUserId: room.ownerId,
            toUserName: room.ownerName,
            toUserEmail: room.ownerEmail,
            status: 'pending',
            experimentPack: Array.isArray(room.experimentPack) ? room.experimentPack.slice(0, 3) : [],
            createdAt: nowIso(),
            updatedAt: nowIso()
        };

        await setDoc(doc(db, INVITE_COLLECTION, joinRequest.id), joinRequest);
        await updateDoc(doc(db, ROOM_COLLECTION, room.id), {
            inviteUserIds: arrayUnion(actor.userId),
            updatedAt: nowIso()
        });
        return joinRequest;
    },

    async joinRoom({ user, profile, roomId }) {
        const actor = buildActorProfile(user, profile);
        if (!roomId) throw new Error('Missing room id.');

        if (!isFirebaseArenaAvailable()) {
            throw new Error('Arena requires a live Firebase connection.');
        }

        const roomRef = doc(db, ROOM_COLLECTION, roomId);
        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) throw new Error('Room not found.');
            const room = normalizeRoom({ id: roomSnap.id, ...roomSnap.data() }, roomSnap.id);
            if (room.status !== 'forming') throw new Error('This room has already started.');
            if (room.memberIds.includes(actor.userId)) return;
            if (room.memberIds.length >= room.capacity) throw new Error('This room is already full.');
            transaction.update(roomRef, {
                memberIds: arrayUnion(actor.userId),
                [`members.${actor.userId}`]: createMemberState(actor),
                updatedAt: nowIso()
            });
        });

        const roomSnap = await getDoc(roomRef);
        return normalizeRoom({ id: roomSnap.id, ...roomSnap.data() }, roomSnap.id);
    },

    async respondToInvite({ user, profile, invite, decision }) {
        if (!invite?.id) throw new Error('Invite not found.');
        const nextDecision = decision === 'accepted' ? 'accepted' : 'declined';

        if (!isFirebaseArenaAvailable()) {
            throw new Error('Arena requires a live Firebase connection.');
        }

        const inviteRef = doc(db, INVITE_COLLECTION, invite.id);
        const roomRef = doc(db, ROOM_COLLECTION, invite.roomId);

        await runTransaction(db, async (transaction) => {
            const inviteSnap = await transaction.get(inviteRef);
            if (!inviteSnap.exists()) throw new Error('Invite no longer exists.');
            const inviteData = normalizeInvite({ id: inviteSnap.id, ...inviteSnap.data() }, inviteSnap.id);
            if (inviteData.status !== 'pending') throw new Error('This invite has already been handled.');

            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) throw new Error('Room not found.');
            const room = normalizeRoom({ id: roomSnap.id, ...roomSnap.data() }, roomSnap.id);
            if (room.status !== 'forming') throw new Error('This room already started.');

            if (nextDecision === 'accepted') {
                if (inviteData.requestKind === 'join_request') {
                    if (!room.memberIds.includes(inviteData.fromUserId) && room.memberIds.length >= room.capacity) {
                        throw new Error('The room is already full.');
                    }
                    transaction.update(roomRef, {
                        memberIds: arrayUnion(inviteData.fromUserId),
                        inviteUserIds: arrayRemove(inviteData.fromUserId),
                        [`members.${inviteData.fromUserId}`]: room.members?.[inviteData.fromUserId] || createMemberState({
                            userId: inviteData.fromUserId,
                            name: inviteData.fromUserName,
                            email: inviteData.fromUserEmail,
                            avatarSeed: inviteData.fromUserName || inviteData.fromUserEmail || inviteData.fromUserId
                        }),
                        updatedAt: nowIso()
                    });
                } else {
                    if (!room.memberIds.includes(inviteData.toUserId) && room.memberIds.length >= room.capacity) {
                        throw new Error('The room is already full.');
                    }
                    transaction.update(roomRef, {
                        memberIds: arrayUnion(inviteData.toUserId),
                        inviteUserIds: arrayRemove(inviteData.toUserId),
                        [`members.${inviteData.toUserId}`]: room.members?.[inviteData.toUserId] || createMemberState({
                            userId: inviteData.toUserId,
                            name: inviteData.toUserName,
                            email: inviteData.toUserEmail,
                            avatarSeed: inviteData.toUserName || inviteData.toUserEmail || inviteData.toUserId
                        }),
                        updatedAt: nowIso()
                    });
                }
            } else {
                const pendingUserId = inviteData.requestKind === 'join_request' ? inviteData.fromUserId : inviteData.toUserId;
                transaction.update(roomRef, {
                    inviteUserIds: arrayRemove(pendingUserId),
                    updatedAt: nowIso()
                });
            }

            transaction.update(inviteRef, {
                status: nextDecision,
                updatedAt: nowIso()
            });
        });

        const inviteSnap = await getDoc(inviteRef);
        return normalizeInvite({ id: inviteSnap.id, ...inviteSnap.data() }, inviteSnap.id);
    },

    async toggleReady({ user, profile, room }) {
        const actor = buildActorProfile(user, profile);
        if (!room?.id) throw new Error('Choose a room first.');
        const member = room.members?.[actor.userId];
        if (!member) throw new Error('You are not a member of this room.');
        const nextReady = !member.ready;
        const nextStatus = room.status === 'forming' ? 'forming' : member.status;

        if (!isFirebaseArenaAvailable()) {
            throw new Error('Arena requires a live Firebase connection.');
        }

        await updateDoc(doc(db, ROOM_COLLECTION, room.id), {
            [`members.${actor.userId}.ready`]: nextReady,
            [`members.${actor.userId}.status`]: nextStatus,
            [`members.${actor.userId}.updatedAt`]: nowIso(),
            updatedAt: nowIso()
        });
    },

    async startRoom({ user, profile, room }) {
        const actor = buildActorProfile(user, profile);
        if (!room?.id) throw new Error('Choose a room first.');
        if (room.ownerId !== actor.userId) throw new Error('Only the room owner can start the challenge.');

        if (!isFirebaseArenaAvailable()) {
            throw new Error('Arena requires a live Firebase connection.');
        }

        const roomRef = doc(db, ROOM_COLLECTION, room.id);
        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) throw new Error('Room not found.');
            const liveRoom = normalizeRoom({ id: roomSnap.id, ...roomSnap.data() }, roomSnap.id);
            if (liveRoom.ownerId !== actor.userId) throw new Error('Only the room owner can start the challenge.');

            const memberValues = Object.values(liveRoom.members || {});
            if (memberValues.length < liveRoom.minMembers) {
                throw new Error(`This room needs at least ${liveRoom.minMembers} scientist${liveRoom.minMembers > 1 ? 's' : ''}.`);
            }
            const everyoneReady = memberValues.every((member) => member.ready || member.userId === actor.userId);
            if (!everyoneReady && liveRoom.mode !== 'solo') throw new Error('Everyone needs to be ready before the room starts.');

            const updatePayload = {
                status: 'active',
                winnerId: '',
                roomScore: 0,
                startedAt: nowIso(),
                completedAt: null,
                updatedAt: nowIso()
            };

            memberValues.forEach((member) => {
                updatePayload[`members.${member.userId}.ready`] = false;
                updatePayload[`members.${member.userId}.status`] = 'active';
                updatePayload[`members.${member.userId}.completedTargets`] = [];
                updatePayload[`members.${member.userId}.actionCount`] = 0;
                updatePayload[`members.${member.userId}.reactionHits`] = 0;
                updatePayload[`members.${member.userId}.score`] = 0;
                updatePayload[`members.${member.userId}.bonusXpEarned`] = 0;
                updatePayload[`members.${member.userId}.finishTimeMs`] = null;
                updatePayload[`members.${member.userId}.updatedAt`] = nowIso();
            });

            transaction.update(roomRef, updatePayload);
        });

        const startedSnap = await getDoc(roomRef);
        return normalizeRoom({ id: startedSnap.id, ...startedSnap.data() }, startedSnap.id);
    },

    async syncMemberProgress({ user, profile, roomId, patch = {} }) {
        const actor = buildActorProfile(user, profile);
        if (!roomId) throw new Error('Missing room id.');

        if (!isFirebaseArenaAvailable()) {
            throw new Error('Arena requires a live Firebase connection.');
        }

        const roomRef = doc(db, ROOM_COLLECTION, roomId);
        await runTransaction(db, async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists()) throw new Error('Room not found.');
            const room = normalizeRoom({ id: roomSnap.id, ...roomSnap.data() }, roomSnap.id);
            const currentMember = room.members?.[actor.userId];
            if (!currentMember) throw new Error('You are not a member of this room.');

            const nextMember = {
                ...currentMember,
                ...patch,
                updatedAt: nowIso()
            };
            const nextMembers = {
                ...room.members,
                [actor.userId]: nextMember
            };
            const allCompleted = Object.values(nextMembers).length > 0 && Object.values(nextMembers).every((member) => member.status === 'completed');

            const updatePayload = {
                [`members.${actor.userId}`]: nextMember,
                roomScore: sumRoomScore(nextMembers),
                updatedAt: nowIso()
            };

            if (!room.winnerId && patch.status === 'completed') {
                updatePayload.winnerId = actor.userId;
            }
            if (allCompleted) {
                updatePayload.status = 'completed';
                updatePayload.completedAt = nowIso();
            }

            transaction.update(roomRef, updatePayload);
        });

        const roomSnap = await getDoc(roomRef);
        return normalizeRoom({ id: roomSnap.id, ...roomSnap.data() }, roomSnap.id);
    },

    filterPlayers(users, queryText, currentUserId, room = null, currentUserEmail = '') {
        const queryValue = String(queryText || '').trim().toLowerCase();
        const aliases = [...new Set([currentUserId, String(currentUserEmail || '').trim().toLowerCase()].filter(Boolean))];
        return (Array.isArray(users) ? users : [])
            .filter((entry) => entry?.userId && !aliases.includes(entry.userId) && !aliases.includes(String(entry.email || '').trim().toLowerCase()))
            .filter((entry) => !(room?.memberIds || []).includes(entry.userId))
            .filter((entry) => !queryValue || String(entry.searchLabel || '').includes(queryValue))
            .slice(0, 10);
    },

    buildActorProfile
};
