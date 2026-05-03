import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Crown, FlaskConical, Play, Radar, Search, Sparkles, Swords, Timer, UserPlus, Users, Zap } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useArenaStore, { selectArenaCollections } from '../store/useArenaStore';
import { labArenaService } from '../lib/labArenaService';

const modeMeta = {
    versus: { label: 'Versus', icon: Swords, badge: 'border-rose-400/30 bg-rose-500/10 text-rose-200' },
    squad: { label: 'Squad', icon: Users, badge: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' },
    solo: { label: 'Solo', icon: Radar, badge: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200' }
};

const statusMeta = {
    forming: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    active: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
    completed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
};

const initialDraft = {
    title: '',
    mode: 'versus',
    privacy: 'invite',
    capacity: 4,
    reactionIds: ['n1', 'g4', 'p1'],
    presetId: 'starter-duel'
};

function MemberRow({ member, winnerId }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                        {winnerId === member.userId && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{member.ready ? 'Ready' : member.status === 'completed' ? 'Completed' : member.status}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-black text-cyan-200">{member.score || 0}</p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Score</p>
                </div>
            </div>
        </div>
    );
}

function formatFinishTime(ms) {
    if (!ms) return 'Still running';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function ContributionRow({ member, winnerId }) {
    return (
        <div className={`rounded-3xl border p-4 ${winnerId === member.userId ? 'border-yellow-400/35 bg-yellow-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                        {winnerId === member.userId && <Crown className="h-4 w-4 text-yellow-400" />}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                        {winnerId === member.userId ? 'Winner of the room' : member.status === 'completed' ? 'Finished challenge' : 'Challenge stats'}
                    </p>
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Contribution Points</p>
                    <p className="mt-1 text-lg font-black text-cyan-200">{member.score || 0}</p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Targets</p>
                    <p className="mt-1 text-base font-black text-white">{member.completedTargets?.length || 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Reactions</p>
                    <p className="mt-1 text-base font-black text-white">{member.reactionHits || 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Actions</p>
                    <p className="mt-1 text-base font-black text-white">{member.actionCount || 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Bonus XP</p>
                    <p className="mt-1 text-base font-black text-emerald-200">{member.bonusXpEarned || 0}</p>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2">
                <div className="flex items-center gap-2 text-slate-300">
                    <Timer className="h-3.5 w-3.5 text-cyan-300" />
                    <span className="text-xs">Finish time</span>
                </div>
                <span className="text-sm font-semibold text-white">{formatFinishTime(member.finishTimeMs)}</span>
            </div>
        </div>
    );
}

export default function LabArena() {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore((state) => ({ user: state.user, profile: state.profile }));
    const arena = useArenaStore();
    const { myRooms, publicRooms, incomingInvites, outgoingInvites, pendingPublicRequests, selectedRoom, playerMatches } = selectArenaCollections(arena);
    const presets = useMemo(() => labArenaService.getReactionPresets(), []);
    const reactions = useMemo(() => labArenaService.getReactionCatalog().slice(0, 15), []);
    const [draft, setDraft] = useState(initialDraft);
    const [busyKey, setBusyKey] = useState('');

    const currentUserId = user?.uid || '';
    const currentMember = selectedRoom?.members?.[currentUserId] || null;
    const members = useMemo(() => Object.values(selectedRoom?.members || {}).sort((a, b) => (b.score || 0) - (a.score || 0)), [selectedRoom]);

    const applyPreset = (presetId) => {
        const preset = presets.find((item) => item.id === presetId);
        if (!preset) return;
        setDraft((state) => ({ ...state, presetId, reactionIds: preset.reactionIds }));
    };

    const toggleReaction = (reactionId) => {
        setDraft((state) => {
            const exists = state.reactionIds.includes(reactionId);
            const reactionIds = exists ? state.reactionIds.filter((id) => id !== reactionId) : [...state.reactionIds, reactionId].slice(0, 5);
            return { ...state, presetId: '', reactionIds: reactionIds.length ? reactionIds : [reactionId] };
        });
    };

    const createRoom = async () => {
        setBusyKey('create');
        try {
            await arena.createRoom({
                title: draft.title,
                mode: draft.mode,
                privacy: draft.privacy,
                capacity: draft.capacity,
                experimentIds: draft.reactionIds
            });
            setDraft((state) => ({ ...state, title: '' }));
        } catch {
            // store already exposes the user-facing error message
        } finally {
            setBusyKey('');
        }
    };

    const openLab = async (roomId) => {
        setBusyKey(`open:${roomId}`);
        try {
            await arena.launchActiveLab(roomId);
            navigate('/lab2d', { state: { arenaRoomId: roomId } });
        } catch {
            // store already exposes the user-facing error message
        } finally {
            setBusyKey('');
        }
    };

    return (
        <div className="space-y-6 text-white">
            {!!arena.error && (
                <section className="rounded-3xl border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                    {arena.error}
                </section>
            )}
            <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.5)] sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                            <Radar className="h-3.5 w-3.5" /> Lab Arena
                        </div>
                        <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Create multiplayer lab rooms and challenge friends inside the 2D lab.</h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Build solo, versus, or squad rooms. Search by username or name, send requests, accept invites from the notification center, and run a reaction pack with room scoring.</p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">My Rooms</p><p className="mt-2 text-2xl font-black">{myRooms.length}</p></div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pending Invites</p><p className="mt-2 text-2xl font-black text-cyan-200">{incomingInvites.filter((item) => item.status === 'pending').length}</p></div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Live Rooms</p><p className="mt-2 text-2xl font-black text-emerald-200">{myRooms.filter((room) => room.status === 'active').length}</p></div>
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5">
                        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-300" /><h2 className="text-lg font-bold">Create Room</h2></div>
                        <div className="mt-5 space-y-4">
                            <input value={draft.title} onChange={(event) => setDraft((state) => ({ ...state, title: event.target.value }))} placeholder={`${profile?.name || user?.displayName || 'Scientist'}'s challenge room`} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/40" />
                            <div className="grid gap-3 sm:grid-cols-3">
                                {['versus', 'squad', 'solo'].map((mode) => {
                                    const meta = modeMeta[mode];
                                    const Icon = meta.icon;
                                    return (
                                        <button key={mode} type="button" onClick={() => setDraft((state) => ({ ...state, mode, capacity: mode === 'solo' ? 1 : Math.max(2, state.capacity) }))} className={`rounded-2xl border p-3 text-left transition ${draft.mode === mode ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'}`}>
                                            <Icon className="h-4 w-4 text-cyan-300" />
                                            <p className="mt-3 text-sm font-semibold">{meta.label}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Privacy</p><select value={draft.privacy} onChange={(event) => setDraft((state) => ({ ...state, privacy: event.target.value }))} className="mt-2 w-full bg-transparent text-sm outline-none"><option value="invite" className="bg-slate-950">Invite Only</option><option value="public" className="bg-slate-950">Public Join</option></select></label>
                                <label className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Capacity</p><select value={draft.capacity} onChange={(event) => setDraft((state) => ({ ...state, capacity: Number(event.target.value) }))} disabled={draft.mode === 'solo'} className="mt-2 w-full bg-transparent text-sm outline-none">{[1, 2, 3, 4, 5, 6].filter((value) => draft.mode === 'solo' ? value === 1 : value >= 2).map((value) => <option key={value} value={value} className="bg-slate-950">{value} members</option>)}</select></label>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Quick Presets</p>
                                <div className="mt-3 grid gap-2">
                                    {presets.map((preset) => <button key={preset.id} type="button" onClick={() => applyPreset(preset.id)} className={`rounded-2xl border px-3 py-3 text-left transition ${draft.presetId === preset.id ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/10 hover:bg-white/[0.04]'}`}><p className="text-sm font-semibold">{preset.label}</p><p className="mt-1 text-xs text-slate-400">{preset.description}</p></button>)}
                                </div>
                            </div>
                            <button type="button" onClick={createRoom} disabled={!draft.reactionIds.length || busyKey === 'create'} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-60"><Zap className="h-4 w-4" /> {busyKey === 'create' ? 'Creating room...' : 'Create Lab Arena Room'}</button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6">
                    <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reaction Builder</p><h2 className="mt-2 text-xl font-black">Choose the experiment pack</h2></div><div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">{draft.reactionIds.length} selected</div></div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {reactions.map((reaction) => <button key={reaction.id} type="button" onClick={() => toggleReaction(reaction.id)} className={`rounded-2xl border px-3 py-3 text-left transition ${draft.reactionIds.includes(reaction.id) ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.05]'}`}><p className="text-sm font-semibold">{reaction.name}</p><p className="mt-1 text-xs text-slate-400">{reaction.type} • {reaction.xp} xp</p></button>)}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6">
                        <div className="flex items-center gap-2"><Search className="h-4 w-4 text-cyan-300" /><h2 className="text-lg font-bold">Find Friends</h2></div>
                        <input value={arena.playerSearch} onChange={(event) => arena.setPlayerSearch(event.target.value)} placeholder="Search by username or name" className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/40" />
                        <div className="mt-4 space-y-2">
                            {playerMatches.map((player) => <div key={player.userId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{player.name}</p><p className="truncate text-xs text-slate-500">{player.email}</p></div><button type="button" disabled={!selectedRoom || selectedRoom.ownerId !== currentUserId || selectedRoom.status !== 'forming'} onClick={async () => { if (!selectedRoom) return; setBusyKey(`invite:${player.userId}`); try { await arena.sendInvite({ room: selectedRoom, targetUser: player }); } catch { } finally { setBusyKey(''); } }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-50"><UserPlus className="h-3.5 w-3.5" />{busyKey === `invite:${player.userId}` ? 'Sending...' : 'Invite'}</button></div>)}
                            {!playerMatches.length && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">Search results will appear here once you type a name and select one of your rooms.</div>}
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6">
                        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-300" /><h2 className="text-lg font-bold">Requests & Invites</h2></div>
                        <div className="mt-4 space-y-3">
                            {incomingInvites.slice(0, 4).map((invite) => <div key={invite.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm font-semibold">{invite.fromUserName}</p><p className="mt-1 text-xs text-slate-400">{invite.requestKind === 'join_request' ? `Requested to join ${invite.roomTitle}` : `Invited you to ${invite.roomTitle}`}</p><div className="mt-3 flex items-center gap-2"><button type="button" disabled={invite.status !== 'pending'} onClick={async () => { setBusyKey(`accept:${invite.id}`); try { await arena.respondToInvite({ invite, decision: 'accepted' }); } catch { } finally { setBusyKey(''); } }} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"><Check className="h-3.5 w-3.5" />{busyKey === `accept:${invite.id}` ? (invite.requestKind === 'join_request' ? 'Approving...' : 'Joining...') : invite.status === 'accepted' ? 'Accepted' : (invite.requestKind === 'join_request' ? 'Approve' : 'Accept')}</button><button type="button" disabled={invite.status !== 'pending'} onClick={() => arena.respondToInvite({ invite, decision: 'declined' }).catch(() => {})} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-60">Decline</button></div></div>)}
                            {!incomingInvites.length && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">No incoming join requests or invites yet. They will also appear in the Arena notification bell.</div>}
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Room Control</p><h2 className="mt-2 text-xl font-black">Manage your active rooms</h2></div><div className="flex flex-wrap gap-2">{myRooms.map((room) => <button key={room.id} type="button" onClick={() => arena.selectRoom(room.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selectedRoom?.id === room.id ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.05]'}`}>{room.title}</button>)}</div></div>
                    {selectedRoom ? (
                        <div className="mt-5 space-y-5">
                            {selectedRoom.status === 'completed' && (
                                <div className="rounded-[1.6rem] border border-yellow-400/30 bg-[linear-gradient(135deg,rgba(250,204,21,0.18),rgba(56,189,248,0.12))] p-5 shadow-[0_18px_40px_rgba(250,204,21,0.08)]">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-200">Winner Declared</p>
                                            <h3 className="mt-2 text-2xl font-black text-white">
                                                {(selectedRoom.members?.[selectedRoom.winnerId]?.name || members[0]?.name || 'Scientist')} wins this arena room
                                            </h3>
                                            <p className="mt-2 text-sm text-slate-200">
                                                Final room score: {selectedRoom.roomScore || 0}. Every member’s individual contribution points are listed below.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-yellow-300/25 bg-slate-950/40 px-4 py-3 text-right">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-100/80">Winning Points</p>
                                            <p className="mt-1 text-2xl font-black text-yellow-300">
                                                {selectedRoom.members?.[selectedRoom.winnerId]?.score || members[0]?.score || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${modeMeta[selectedRoom.mode]?.badge || modeMeta.versus.badge}`}>{modeMeta[selectedRoom.mode]?.label || 'Versus'}</span>
                                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta[selectedRoom.status] || statusMeta.forming}`}>{selectedRoom.status}</span>
                                        </div>
                                        <h3 className="mt-3 text-2xl font-black">{selectedRoom.title}</h3>
                                        <p className="mt-2 text-sm text-slate-300">{members.length} / {selectedRoom.capacity} members • {selectedRoom.privacy === 'public' ? 'Public requests' : 'Invite only'} • {selectedRoom.experimentPack.length} experiments</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-right"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Room Score</p><p className="mt-2 text-2xl font-black text-cyan-200">{selectedRoom.roomScore || 0}</p></div>
                                </div>
                            </div>
                            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                                <div className="space-y-4">
                                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Experiment Pack</p><div className="mt-4 space-y-3">{selectedRoom.experimentPack.map((reaction, index) => <div key={reaction.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Experiment {index + 1}</p><p className="mt-1 text-sm font-semibold">{reaction.name}</p><p className="mt-1 text-xs text-slate-400">{reaction.equation}</p></div>)}</div></div>
                                    <div className="flex flex-wrap gap-3">
                                        {currentMember && selectedRoom.status === 'forming' && <button type="button" onClick={() => arena.toggleReady(selectedRoom).catch(() => {})} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold transition hover:bg-white/[0.08]"><Check className="h-4 w-4 text-cyan-300" />{currentMember.ready ? 'Unready' : 'Ready Up'}</button>}
                                        {selectedRoom.ownerId === currentUserId && selectedRoom.status === 'forming' && <button type="button" onClick={() => arena.startRoom(selectedRoom).catch(() => {})} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"><Play className="h-4 w-4" />Start Room</button>}
                                        {selectedRoom.status === 'active' && selectedRoom.memberIds.includes(currentUserId) && <button type="button" onClick={() => openLab(selectedRoom.id)} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110"><FlaskConical className="h-4 w-4" />{busyKey === `open:${selectedRoom.id}` ? 'Opening...' : 'Enter 2D Lab'}</button>}
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Scientist Board</p><div className="mt-4 space-y-3">{members.map((member) => <MemberRow key={member.userId} member={member} winnerId={selectedRoom.winnerId} />)}</div></div>
                            </div>
                            {selectedRoom.status === 'completed' && (
                                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Individual Contribution Points</p>
                                    <h4 className="mt-2 text-lg font-black text-white">Full member contribution breakdown</h4>
                                    <div className="mt-4 space-y-3">
                                        {members.map((member) => <ContributionRow key={`contrib-${member.userId}`} member={member} winnerId={selectedRoom.winnerId} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center"><p className="text-lg font-semibold">No room selected yet</p><p className="mt-2 text-sm text-slate-400">Create a room or accept an invite to unlock the control center.</p></div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6">
                        <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Open Rooms</p><h2 className="mt-2 text-xl font-black">Public matchmaking</h2></div><Users className="h-5 w-5 text-cyan-300" /></div>
                        <div className="mt-4 space-y-3">
                            {publicRooms.map((room) => {
                                const alreadyRequested = pendingPublicRequests.some((invite) => invite.roomId === room.id);
                                return <div key={room.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{room.title}</p><p className="mt-1 text-xs text-slate-400">{room.ownerName} • {room.memberIds.length}/{room.capacity} members • {room.experimentPack.length} experiments</p><div className="mt-3 flex flex-wrap gap-2">{Object.values(room.members || {}).map((member) => <span key={`${room.id}-${member.userId}`} className="rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[11px] font-semibold text-slate-200">{member.name}</span>)}</div></div><button type="button" disabled={alreadyRequested} onClick={() => arena.requestToJoinPublicRoom(room).catch(() => {})} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50">{alreadyRequested ? 'Requested' : 'Request to Join'} <ArrowRight className="h-3.5 w-3.5" /></button></div></div>;
                            })}
                            {!publicRooms.length && <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">No public rooms are waiting right now. Make one of your rooms public to collect join requests from other students.</div>}
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6">
                        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-300" /><h2 className="text-lg font-bold">Sent Requests</h2></div>
                        <div className="mt-4 space-y-3">
                            {outgoingInvites.slice(0, 5).map((invite) => <div key={invite.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm font-semibold">{invite.requestKind === 'join_request' ? invite.toUserName : invite.toUserName}</p><p className="mt-1 text-xs text-slate-400">{invite.requestKind === 'join_request' ? `Join request for ${invite.roomTitle}` : `Invite sent for ${invite.roomTitle}`}</p><span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${invite.status === 'pending' ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' : invite.status === 'accepted' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}>{invite.status}</span></div>)}
                            {!outgoingInvites.length && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">Invite history and public-room join requests will appear here after you send them.</div>}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
