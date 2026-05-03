import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { labArenaService } from '../lib/labArenaService';
import useGameStore from './useGameStore';
import { safeLocalStorage } from '../utils/safeStorage';

let arenaUnsubscribe = null;

const upsertEntity = (list = [], entity) => {
    if (!entity?.id) return Array.isArray(list) ? list : [];
    const next = Array.isArray(list) ? [...list] : [];
    const index = next.findIndex((entry) => entry?.id === entity.id);
    if (index >= 0) next[index] = entity;
    else next.unshift(entity);
    return next;
};

const getViewerAliases = (user) => {
    const aliases = [user?.uid, String(user?.email || '').trim().toLowerCase()].filter(Boolean);
    return [...new Set(aliases)];
};

const buildNotificationItems = (viewer, invites = [], rooms = [], dismissed = {}) => {
    const aliases = getViewerAliases(viewer);
    const notifications = [];

    invites.forEach((invite) => {
        if (!aliases.includes(invite.toUserId) || invite.status !== 'pending') return;
        notifications.push({
            id: `invite:${invite.id}`,
            type: invite.requestKind === 'join_request' ? 'join_request' : 'invite',
            roomId: invite.roomId,
            inviteId: invite.id,
            title: invite.requestKind === 'join_request'
                ? `${invite.fromUserName} wants to join`
                : `${invite.fromUserName} invited you`,
            body: invite.requestKind === 'join_request'
                ? `${invite.fromUserName} requested access to your public room ${invite.roomTitle}.`
                : `${invite.roomTitle} is ready for ${invite.roomMode === 'squad' ? 'co-op' : invite.roomMode === 'solo' ? 'solo' : 'versus'} lab play.`,
            createdAt: invite.createdAt
        });
    });

    rooms.forEach((room) => {
        if (!(room.memberIds || []).some((memberId) => aliases.includes(memberId))) return;
        if (room.status === 'active') {
            notifications.push({
                id: `room-start:${room.id}`,
                type: 'room_start',
                roomId: room.id,
                title: `${room.title} has started`,
                body: `Open the 2D lab and complete ${room.experimentPack?.length || 0} experiment${(room.experimentPack?.length || 0) === 1 ? '' : 's'}.`,
                createdAt: room.startedAt || room.updatedAt
            });
        }
        if (room.status === 'completed') {
            const winnerName = room.members?.[room.winnerId]?.name || 'A scientist';
            notifications.push({
                id: `room-complete:${room.id}`,
                type: 'room_complete',
                roomId: room.id,
                title: `${room.title} is complete`,
                body: `${winnerName} finished on top. Review the room board for scores and timing.`,
                createdAt: room.completedAt || room.updatedAt
            });
        }
    });

    return notifications
        .filter((item) => !dismissed[item.id])
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
};

const roomForUser = (rooms, viewer) => {
    const aliases = getViewerAliases(viewer);
    return Array.isArray(rooms) ? rooms.filter((room) => (room.memberIds || []).some((memberId) => aliases.includes(memberId))) : [];
};

const isTargetReaction = (session, reactionId) => {
    if (!session || !reactionId) return false;
    const remaining = session.experimentPack.filter((item) => !session.completedTargetIds.includes(item.id));
    return remaining.some((item) => item.id === reactionId);
};

const computeSpeedBonus = (elapsedMs) => {
    const normalized = Math.max(0, Math.floor((90000 - elapsedMs) / 2000));
    return Math.max(12, Math.min(60, normalized));
};

const defaultSessionState = (room) => ({
    roomId: room.id,
    roomTitle: room.title,
    mode: room.mode,
    experimentPack: Array.isArray(room.experimentPack) ? room.experimentPack : [],
    startedAt: Date.now(),
    completedTargetIds: [],
    score: 0,
    actionCount: 0,
    reactionHits: 0,
    bonusXp: 0,
    status: 'active',
    lastActionTs: 0,
    lastReactionId: '',
    lastTargetCompletedAt: Date.now(),
    actionsSinceLastTarget: 0,
    labOpened: false,
    rewarded: false
});

const pushRoomProgress = async (roomId, patch) => {
    const { user, profile } = useArenaStore.getState();
    if (!user?.uid || !roomId) return;
    try {
        await labArenaService.syncMemberProgress({ user, profile, roomId, patch });
    } catch {
        // best-effort sync for active arena sessions
    }
};

const closeSubscription = () => {
    if (arenaUnsubscribe) {
        arenaUnsubscribe();
        arenaUnsubscribe = null;
    }
};

const useArenaStore = create(
    persist(
        (set, get) => ({
            user: null,
            profile: null,
            storageMode: 'online',
            isLoading: false,
            error: '',
            users: [],
            rooms: [],
            invites: [],
            selectedRoomId: '',
            playerSearch: '',
            dismissedNotifications: {},
            notifications: [],
            activeSession: null,

            bootstrap: ({ user, profile }) => {
                if (!user?.uid) {
                    closeSubscription();
                    set({
                        user: null,
                        profile: null,
                        users: [],
                        rooms: [],
                        invites: [],
                        notifications: [],
                        isLoading: false,
                        error: '',
                        selectedRoomId: '',
                        activeSession: null
                    });
                    return;
                }

                const current = get();
                if (current.user?.uid === user.uid && arenaUnsubscribe) {
                    set({ profile: profile || null });
                    return;
                }

                closeSubscription();
                set({
                    user,
                    profile: profile || null,
                    isLoading: true,
                    error: ''
                });

                arenaUnsubscribe = labArenaService.subscribeArena({
                    user,
                    onUsers: (users) => {
                        set({ users });
                    },
                    onRooms: (rooms) => {
                        const active = get().activeSession;
                        const dismissed = get().dismissedNotifications;
                        const notifications = buildNotificationItems(user, get().invites, rooms, dismissed);
                        const aliases = getViewerAliases(user);
                        const selectedRoomId = get().selectedRoomId || rooms.find((room) => (room.memberIds || []).some((memberId) => aliases.includes(memberId)))?.id || rooms[0]?.id || '';
                        const nextActiveRoom = active?.roomId ? rooms.find((room) => room.id === active.roomId) : null;
                        set({
                            rooms,
                            notifications,
                            selectedRoomId
                        });

                        if (active && !nextActiveRoom) {
                            set({ activeSession: null });
                            return;
                        }

                        if (active && nextActiveRoom?.status === 'completed' && active.status !== 'completed') {
                            set((state) => ({
                                activeSession: state.activeSession
                                    ? {
                                        ...state.activeSession,
                                        status: 'completed'
                                    }
                                    : null
                            }));
                        }
                    },
                    onInvites: (invites) => {
                        const dismissed = get().dismissedNotifications;
                        const notifications = buildNotificationItems(user, invites, get().rooms, dismissed);
                        set({
                            invites,
                            notifications
                        });
                    },
                    onMode: (storageMode) => set({ storageMode }),
                    onError: (error) => {
                        set({
                            error: error?.message || 'Lab Arena failed to sync.',
                            isLoading: false
                        });
                    }
                });

                set({ isLoading: false });
            },

            setPlayerSearch: (playerSearch) => set({ playerSearch }),

            dismissNotification: (notificationId) => {
                const nextDismissed = {
                    ...get().dismissedNotifications,
                    [notificationId]: true
                };
                set({
                    dismissedNotifications: nextDismissed,
                    notifications: buildNotificationItems(get().user, get().invites, get().rooms, nextDismissed)
                });
            },

            clearDismissedNotifications: () => {
                set({
                    dismissedNotifications: {},
                    notifications: buildNotificationItems(get().user, get().invites, get().rooms, {})
                });
            },

            selectRoom: (roomId) => set({ selectedRoomId: roomId }),

            createRoom: async (draft) => {
                const { user, profile } = get();
                if (!user?.uid) throw new Error('Please sign in to create a room.');
                set({ error: '' });
                try {
                    const room = await labArenaService.createRoom({ user, profile, ...draft });
                    set((state) => ({
                        rooms: upsertEntity(state.rooms, room),
                        selectedRoomId: room.id
                    }));
                    return room;
                } catch (error) {
                    set({ error: error?.message || 'Unable to create room.' });
                    throw error;
                }
            },

            sendInvite: async ({ room, targetUser }) => {
                const { user, profile } = get();
                if (!user?.uid) throw new Error('Please sign in to invite players.');
                set({ error: '' });
                try {
                    const invite = await labArenaService.sendInvite({ user, profile, room, targetUser });
                    set((state) => ({
                        invites: upsertEntity(state.invites, invite),
                        rooms: room?.id
                            ? state.rooms.map((entry) => entry.id === room.id
                                ? {
                                    ...entry,
                                    inviteUserIds: [...new Set([...(entry.inviteUserIds || []), targetUser.userId])],
                                    updatedAt: invite.updatedAt
                                }
                                : entry)
                            : state.rooms
                    }));
                    return invite;
                } catch (error) {
                    set({ error: error?.message || 'Unable to send invite.' });
                    throw error;
                }
            },

            requestToJoinPublicRoom: async (room) => {
                const { user, profile } = get();
                if (!user?.uid) throw new Error('Please sign in to request a room.');
                set({ error: '' });
                try {
                    const request = await labArenaService.requestToJoinPublicRoom({ user, profile, room });
                    set((state) => ({
                        invites: upsertEntity(state.invites, request),
                        rooms: state.rooms.map((entry) => entry.id === room.id
                            ? {
                                ...entry,
                                inviteUserIds: [...new Set([...(entry.inviteUserIds || []), user.uid])],
                                updatedAt: request.updatedAt
                            }
                            : entry)
                    }));
                    return request;
                } catch (error) {
                    set({ error: error?.message || 'Unable to request access to the room.' });
                    throw error;
                }
            },

            joinRoom: async (roomId) => {
                const { user, profile } = get();
                if (!user?.uid) throw new Error('Please sign in to join a room.');
                set({ error: '' });
                try {
                    const room = await labArenaService.joinRoom({ user, profile, roomId });
                    set((state) => ({
                        rooms: upsertEntity(state.rooms, room),
                        selectedRoomId: room.id
                    }));
                    return room;
                } catch (error) {
                    set({ error: error?.message || 'Unable to join room.' });
                    throw error;
                }
            },

            respondToInvite: async ({ invite, decision }) => {
                const { user, profile } = get();
                if (!user?.uid) throw new Error('Please sign in to handle invites.');
                set({ error: '' });
                try {
                    const nextInvite = await labArenaService.respondToInvite({ user, profile, invite, decision });
                    set((state) => ({
                        invites: upsertEntity(state.invites, nextInvite)
                    }));
                    return nextInvite;
                } catch (error) {
                    set({ error: error?.message || 'Unable to update invite.' });
                    throw error;
                }
            },

            toggleReady: async (room) => {
                const { user, profile } = get();
                if (!user?.uid) throw new Error('Please sign in to update readiness.');
                set({ error: '' });
                try {
                    const nextRoom = await labArenaService.toggleReady({ user, profile, room });
                    if (nextRoom?.id) {
                        set((state) => ({ rooms: upsertEntity(state.rooms, nextRoom) }));
                    }
                    return nextRoom;
                } catch (error) {
                    set({ error: error?.message || 'Unable to update readiness.' });
                    throw error;
                }
            },

            startRoom: async (room) => {
                const { user, profile } = get();
                if (!user?.uid) throw new Error('Please sign in to start the room.');
                set({ error: '' });
                try {
                    const started = await labArenaService.startRoom({ user, profile, room });
                    set((state) => ({
                        rooms: upsertEntity(state.rooms, started),
                        selectedRoomId: started.id
                    }));
                    return started;
                } catch (error) {
                    set({ error: error?.message || 'Unable to start room.' });
                    throw error;
                }
            },

            launchActiveLab: async (roomId) => {
                const room = get().rooms.find((entry) => entry.id === roomId);
                if (!room) throw new Error('Room not found.');
                const existing = get().activeSession;
                const nextSession = existing?.roomId === room.id && existing.status === 'active'
                    ? {
                        ...existing,
                        labOpened: true
                    }
                    : {
                        ...defaultSessionState(room),
                        labOpened: true
                    };

                set({
                    activeSession: nextSession,
                    selectedRoomId: room.id
                });

                await pushRoomProgress(room.id, {
                    status: 'active',
                    actionCount: nextSession.actionCount,
                    reactionHits: nextSession.reactionHits,
                    completedTargets: nextSession.completedTargetIds,
                    score: nextSession.score,
                    bonusXpEarned: nextSession.bonusXp
                });

                return room;
            },

            registerLabAction: (action) => {
                const session = get().activeSession;
                if (!session || session.status !== 'active' || !action?.ts || action.ts <= session.lastActionTs) return;

                const delta = action.type === 'add_chemical' ? 3 : action.type === 'pour' ? 2 : action.type === 'undo' ? -6 : 1;
                const nextScore = Math.max(0, session.score + delta);
                const nextActionCount = session.actionCount + 1;
                const nextState = {
                    ...session,
                    score: nextScore,
                    actionCount: nextActionCount,
                    actionsSinceLastTarget: Math.max(0, session.actionsSinceLastTarget + 1),
                    lastActionTs: action.ts
                };

                set({ activeSession: nextState });

                if (nextActionCount % 4 === 0) {
                    void pushRoomProgress(session.roomId, {
                        status: 'active',
                        score: nextState.score,
                        actionCount: nextState.actionCount,
                        reactionHits: nextState.reactionHits,
                        completedTargets: nextState.completedTargetIds,
                        bonusXpEarned: nextState.bonusXp
                    });
                }
            },

            registerReaction: (reaction) => {
                const session = get().activeSession;
                if (!session || session.status !== 'active' || !reaction?.id) return;
                if (session.lastReactionId === reaction.id && !isTargetReaction(session, reaction.id)) return;

                const nextReactionHits = session.reactionHits + 1;
                if (!isTargetReaction(session, reaction.id)) {
                    const offTargetScore = session.score + 12;
                    const nextState = {
                        ...session,
                        score: offTargetScore,
                        reactionHits: nextReactionHits,
                        lastReactionId: reaction.id
                    };
                    set({ activeSession: nextState });
                    void pushRoomProgress(session.roomId, {
                        status: 'active',
                        score: nextState.score,
                        actionCount: nextState.actionCount,
                        reactionHits: nextState.reactionHits,
                        completedTargets: nextState.completedTargetIds,
                        bonusXpEarned: nextState.bonusXp
                    });
                    return;
                }

                const target = session.experimentPack.find((item) => item.id === reaction.id);
                const elapsedMs = Date.now() - session.lastTargetCompletedAt;
                const baseScore = 90 + (Number(target?.xp) || Number(reaction.xp) || 40);
                const speedBonus = computeSpeedBonus(elapsedMs);
                const efficiencyBonus = Math.max(8, 30 - session.actionsSinceLastTarget * 2);
                const earnedXp = Math.max(20, Math.round((baseScore + speedBonus + efficiencyBonus) / 8));
                const nextCompletedTargets = [...session.completedTargetIds, reaction.id];
                const nextScore = session.score + baseScore + speedBonus + efficiencyBonus;
                const nextBonusXp = session.bonusXp + earnedXp;
                const sessionComplete = nextCompletedTargets.length >= session.experimentPack.length;

                const nextState = {
                    ...session,
                    score: nextScore,
                    reactionHits: nextReactionHits,
                    completedTargetIds: nextCompletedTargets,
                    bonusXp: nextBonusXp,
                    lastReactionId: reaction.id,
                    lastTargetCompletedAt: Date.now(),
                    actionsSinceLastTarget: 0,
                    status: sessionComplete ? 'completed' : 'active'
                };

                set({ activeSession: nextState });

                void pushRoomProgress(session.roomId, {
                    status: sessionComplete ? 'completed' : 'active',
                    score: nextState.score,
                    actionCount: nextState.actionCount,
                    reactionHits: nextState.reactionHits,
                    completedTargets: nextState.completedTargetIds,
                    bonusXpEarned: nextState.bonusXp,
                    finishTimeMs: sessionComplete ? Date.now() - session.startedAt : null
                });

                if (sessionComplete && !session.rewarded) {
                    useGameStore.getState().addXP(nextBonusXp);
                    set((state) => ({
                        activeSession: state.activeSession
                            ? {
                                ...state.activeSession,
                                rewarded: true
                            }
                            : null
                    }));
                }
            },

            endActiveSession: async () => {
                const session = get().activeSession;
                if (!session) return;
                await pushRoomProgress(session.roomId, {
                    status: session.status === 'completed' ? 'completed' : 'active',
                    score: session.score,
                    actionCount: session.actionCount,
                    reactionHits: session.reactionHits,
                    completedTargets: session.completedTargetIds,
                    bonusXpEarned: session.bonusXp,
                    finishTimeMs: session.status === 'completed' ? Date.now() - session.startedAt : null
                });
                set({ activeSession: null });
            }
        }),
        {
            name: 'clab-arena-store',
            storage: safeLocalStorage,
            partialize: (state) => ({
                activeSession: state.activeSession,
                dismissedNotifications: state.dismissedNotifications
            })
        }
    )
);

export const selectArenaCollections = (state) => {
    const userId = state.user?.uid || '';
    const aliases = getViewerAliases(state.user);
    const myRooms = roomForUser(state.rooms, state.user);
    const publicRooms = state.rooms.filter((room) => room.privacy === 'public' && room.status === 'forming' && !(room.memberIds || []).some((memberId) => aliases.includes(memberId)));
    const incomingInvites = state.invites.filter((invite) => aliases.includes(invite.toUserId));
    const outgoingInvites = state.invites.filter((invite) => aliases.includes(invite.fromUserId));
    const pendingPublicRequests = outgoingInvites.filter((invite) => invite.requestKind === 'join_request' && invite.status === 'pending');
    const selectedRoom = myRooms.find((room) => room.id === state.selectedRoomId) || myRooms[0] || null;
    const playerMatches = labArenaService.filterPlayers(state.users, state.playerSearch, userId, selectedRoom, state.user?.email || '');

    return {
        myRooms,
        publicRooms,
        incomingInvites,
        outgoingInvites,
        pendingPublicRequests,
        selectedRoom,
        playerMatches
    };
};

export default useArenaStore;
