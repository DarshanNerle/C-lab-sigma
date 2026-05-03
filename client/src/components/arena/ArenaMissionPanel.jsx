import React from 'react';
import { Crown, FlaskConical, Target, Timer, Trophy } from 'lucide-react';

function formatDuration(ms) {
    if (!ms) return 'Live';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function ArenaMissionPanel({ room, session }) {
    if (!room || !session) return null;

    const members = Object.values(room.members || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
    const remaining = session.experimentPack.filter((item) => !session.completedTargetIds.includes(item.id));
    const currentTarget = remaining[0] || null;
    const winner = room.winnerId ? room.members?.[room.winnerId] : members[0] || null;

    return (
        <aside className="pointer-events-auto absolute right-4 top-4 z-40 w-[min(28rem,calc(100vw-2rem))] rounded-[1.7rem] border border-white/10 bg-slate-950/88 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Lab Arena Live</p>
                    <h3 className="mt-2 text-lg font-black text-white">{room.title}</h3>
                </div>
                <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Your Score</p>
                    <p className="mt-1 text-xl font-black text-cyan-200">{session.score}</p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Targets</p>
                    <p className="mt-1 text-base font-black text-white">{session.completedTargetIds.length}/{session.experimentPack.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Reactions</p>
                    <p className="mt-1 text-base font-black text-white">{session.reactionHits}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Timer</p>
                    <p className="mt-1 text-base font-black text-white">{formatDuration(Date.now() - session.startedAt)}</p>
                </div>
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <div className="flex items-center gap-2 text-cyan-100">
                    <Target className="h-4 w-4" />
                    <p className="text-sm font-semibold">Current objective</p>
                </div>
                {currentTarget ? (
                    <>
                        <p className="mt-3 text-base font-bold text-white">{currentTarget.name}</p>
                        <p className="mt-1 text-xs text-slate-300">{currentTarget.equation}</p>
                    </>
                ) : (
                    <p className="mt-3 text-sm font-semibold text-emerald-200">All target experiments completed. Keep an eye on the scoreboard.</p>
                )}
            </div>

            {room.status === 'completed' && winner && (
                <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-200">Winner Declared</p>
                    <p className="mt-2 text-lg font-black text-white">{winner.name} wins the arena room</p>
                    <p className="mt-1 text-sm text-slate-200">
                        Final contribution points: {winner.score || 0}
                    </p>
                </div>
            )}

            <div className="mt-4">
                <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-cyan-300" />
                    <p className="text-sm font-semibold text-white">Room leaderboard and contribution points</p>
                </div>
                <div className="mt-3 space-y-2">
                    {members.map((member) => (
                        <div key={member.userId} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <FlaskConical className="h-3.5 w-3.5 text-cyan-300" />
                                    <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                                    {room.winnerId === member.userId && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-cyan-200">{member.score || 0}</p>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{member.completedTargets?.length || 0} clears • {member.reactionHits || 0} reactions</p>
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-white/10 bg-slate-950/45 px-2 py-2 text-center">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Actions</p>
                                    <p className="mt-1 text-xs font-bold text-white">{member.actionCount || 0}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-slate-950/45 px-2 py-2 text-center">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Bonus XP</p>
                                    <p className="mt-1 text-xs font-bold text-emerald-200">{member.bonusXpEarned || 0}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-slate-950/45 px-2 py-2 text-center">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Finish</p>
                                    <p className="mt-1 text-xs font-bold text-white">{formatDuration(member.finishTimeMs || 0)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2 text-slate-300">
                    <Timer className="h-4 w-4 text-cyan-300" />
                    <span className="text-xs">Challenge XP bonus queued: {session.bonusXp}</span>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    {session.status}
                </span>
            </div>
        </aside>
    );
}
