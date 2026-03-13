import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import useAuthStore from '../store/useAuthStore';
import {
    Crown,
    Sparkles,
    Trophy,
    Users,
    Flame,
    ArrowUpRight,
    Star
} from 'lucide-react';

const medalForRank = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
};

const avatarColor = (seed = '') => {
    const colors = ['from-cyan-500 to-blue-500', 'from-emerald-500 to-teal-500', 'from-indigo-500 to-sky-500', 'from-rose-500 to-pink-500'];
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash + seed.charCodeAt(i) * (i + 1)) % colors.length;
    }
    return colors[hash] || colors[0];
};

const initialsFromName = (name = '') => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export default function LeaderboardPage() {
    const { user } = useAuthStore((state) => ({ user: state.user }));
    const [leagueScores, setLeagueScores] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'league_scores'), (snapshot) => {
            const rows = snapshot.docs.map((doc) => {
                const data = doc.data();
                const lastUpdated = data.lastUpdated?.toDate
                    ? data.lastUpdated.toDate()
                    : data.lastUpdated
                        ? new Date(data.lastUpdated)
                        : null;
                return {
                    id: doc.id,
                    ...data,
                    lastUpdatedDate: lastUpdated
                };
            });
            setLeagueScores(rows);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const rows = snapshot.docs.map((doc) => {
                const data = doc.data();
                const userName = String(data?.name || data?.displayName || data?.email?.split('@')[0] || 'Student');
                return {
                    userId: doc.id,
                    userName,
                    email: data?.email || ''
                };
            });
            setUsers(rows);
        });

        return () => unsubscribe();
    }, []);

    const ranked = useMemo(() => {
        const leagueById = new Map(leagueScores.map((item) => [item.userId || item.id, item]));
        const merged = users.length
            ? users.map((userRow) => {
                const league = leagueById.get(userRow.userId) || {};
                return {
                    userId: userRow.userId,
                    userName: league.userName || userRow.userName || 'Student',
                    totalExperiments: Number(league.totalExperiments) || 0,
                    totalScore: Number(league.totalScore) || 0,
                    averageAccuracy: Number(league.averageAccuracy) || 0,
                    lastExperiment: league.lastExperiment || '',
                    lastUpdatedDate: league.lastUpdatedDate || null
                };
            })
            : leagueScores.map((item) => ({
                userId: item.userId || item.id,
                userName: item.userName || 'Student',
                totalExperiments: Number(item.totalExperiments) || 0,
                totalScore: Number(item.totalScore) || 0,
                averageAccuracy: Number(item.averageAccuracy) || 0,
                lastExperiment: item.lastExperiment || '',
                lastUpdatedDate: item.lastUpdatedDate || null
            }));

        const existingIds = new Set(merged.map((item) => item.userId));
        leagueScores.forEach((item) => {
            const uid = item.userId || item.id;
            if (!uid || existingIds.has(uid)) return;
            merged.push({
                userId: uid,
                userName: item.userName || 'Student',
                totalExperiments: Number(item.totalExperiments) || 0,
                totalScore: Number(item.totalScore) || 0,
                averageAccuracy: Number(item.averageAccuracy) || 0,
                lastExperiment: item.lastExperiment || '',
                lastUpdatedDate: item.lastUpdatedDate || null
            });
        });

        const sorted = [...merged].sort((a, b) => {
            const scoreDiff = (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0);
            if (scoreDiff !== 0) return scoreDiff;
            return (Number(b.averageAccuracy) || 0) - (Number(a.averageAccuracy) || 0);
        });
        return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
    }, [scores]);

    const topScore = ranked[0]?.totalScore || 1;
    const topTen = ranked.slice(0, 10);
    const currentUser = ranked.find((item) => item.userId === user?.uid);
    const weeklyTop = useMemo(() => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recent = ranked.filter((item) => item.lastUpdatedDate && item.lastUpdatedDate.getTime() >= weekAgo);
        return recent[0] || ranked[0] || null;
    }, [ranked]);

    return (
        <div className="w-full space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-[0_16px_40px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Trophy className="h-7 w-7 text-yellow-400" />
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Student League</h1>
                            <p className="mt-1 text-sm text-slate-400">Global performance rankings from experiment accuracy and score.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>{ranked.length} active students</span>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {ranked.slice(0, 3).map((student, index) => (
                    <motion.article
                        key={student.userId || student.id || index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950/60 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.5)] backdrop-blur-xl"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColor(student.userName || '')} text-white font-bold`}>
                                    {initialsFromName(student.userName || 'Student')}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Rank {medalForRank(student.rank)}</p>
                                    <p className="text-lg font-bold text-white">{student.userName || 'Student'}</p>
                                </div>
                            </div>
                            <Crown className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-400">
                            <div>
                                <p className="uppercase tracking-[0.2em]">Score</p>
                                <p className="mt-1 text-lg font-black text-emerald-300">{student.totalScore || 0}</p>
                            </div>
                            <div>
                                <p className="uppercase tracking-[0.2em]">Accuracy</p>
                                <p className="mt-1 text-lg font-black text-cyan-300">{student.averageAccuracy || 0}%</p>
                            </div>
                            <div>
                                <p className="uppercase tracking-[0.2em]">Experiments</p>
                                <p className="mt-1 text-lg font-black text-white">{student.totalExperiments || 0}</p>
                            </div>
                        </div>
                    </motion.article>
                ))}
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-cyan-400" />
                            <h2 className="text-lg font-bold text-white">Top 10 Students</h2>
                        </div>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Global</span>
                    </div>
                    <div className="mt-4 space-y-3">
                        {topTen.map((student) => {
                            const progress = Math.round(((Number(student.totalScore) || 0) / topScore) * 100);
                            const isCurrent = student.userId === user?.uid;
                            return (
                                <div
                                    key={student.userId || student.id}
                                    className={`rounded-2xl border border-white/10 px-4 py-3 transition ${isCurrent ? 'bg-cyan-500/10' : 'bg-white/5 hover:bg-white/[0.08]'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-slate-300">{medalForRank(student.rank)}</span>
                                            <div>
                                                <p className={`font-semibold ${isCurrent ? 'text-cyan-200' : 'text-white'}`}>
                                                    {student.userName || 'Student'} {isCurrent && '(You)'}
                                                </p>
                                                <p className="text-xs text-slate-500">{student.lastExperiment || 'No recent experiment'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-300">{student.totalScore || 0}</p>
                                            <p className="text-xs text-slate-500">{student.averageAccuracy || 0}% acc.</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-2 w-full rounded-full bg-white/5">
                                        <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {!topTen.length && (
                            <p className="text-sm text-slate-500">No league scores yet. Complete an experiment to join the league.</p>
                        )}
                    </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-400" />
                        <h2 className="text-lg font-bold text-white">Weekly Top Performer</h2>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        {weeklyTop ? (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColor(weeklyTop.userName || '')} text-white font-bold`}>
                                        {initialsFromName(weeklyTop.userName || 'Student')}
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400">Rank {weeklyTop.rank}</p>
                                        <p className="text-lg font-bold text-white">{weeklyTop.userName || 'Student'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
                                    <div>
                                        <p className="uppercase tracking-[0.2em]">Score</p>
                                        <p className="mt-1 text-lg font-black text-emerald-300">{weeklyTop.totalScore || 0}</p>
                                    </div>
                                    <div>
                                        <p className="uppercase tracking-[0.2em]">Accuracy</p>
                                        <p className="mt-1 text-lg font-black text-cyan-300">{weeklyTop.averageAccuracy || 0}%</p>
                                    </div>
                                </div>
                                <p className="mt-4 text-xs text-slate-500">Based on updates from the last 7 days.</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No weekly data yet.</p>
                        )}
                    </div>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <span>Global Ranking</span>
                        </div>
                        {currentUser ? (
                            <div className="mt-3 flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-bold text-white">#{currentUser.rank}</p>
                                    <p className="text-xs text-slate-500">{currentUser.totalExperiments || 0} experiments completed</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-emerald-300">{currentUser.totalScore || 0}</p>
                                    <p className="text-xs text-slate-500">{currentUser.averageAccuracy || 0}% accuracy</p>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-slate-500">Complete an experiment to earn a global rank.</p>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                        <h2 className="text-lg font-bold text-white">Full Leaderboard</h2>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Updates</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[900px] w-full border-separate border-spacing-0 text-left text-sm">
                        <thead>
                            <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                <th className="px-3 py-3">Rank</th>
                                <th className="px-3 py-3">Student</th>
                                <th className="px-3 py-3">Experiments</th>
                                <th className="px-3 py-3">Avg Accuracy</th>
                                <th className="px-3 py-3">Total Score</th>
                                <th className="px-3 py-3">Last Experiment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranked.map((student) => {
                                const isCurrent = student.userId === user?.uid;
                                return (
                                    <tr key={student.userId || student.id} className={`border-t border-white/5 ${isCurrent ? 'bg-cyan-500/10' : 'hover:bg-white/[0.04]'}`}>
                                        <td className="px-3 py-4 font-semibold text-slate-200">{medalForRank(student.rank)}</td>
                                        <td className="px-3 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor(student.userName || '')} text-xs font-bold text-white`}>
                                                    {initialsFromName(student.userName || 'Student')}
                                                </div>
                                                <div>
                                                    <p className={`font-semibold ${isCurrent ? 'text-cyan-200' : 'text-white'}`}>
                                                        {student.userName || 'Student'} {isCurrent && '(You)'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{student.userId || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 text-slate-200">{student.totalExperiments || 0}</td>
                                        <td className="px-3 py-4 text-cyan-200">{student.averageAccuracy || 0}%</td>
                                        <td className="px-3 py-4 text-emerald-300">{student.totalScore || 0}</td>
                                        <td className="px-3 py-4 text-slate-400">{student.lastExperiment || '—'}</td>
                                    </tr>
                                );
                            })}
                            {!ranked.length && (
                                <tr>
                                    <td colSpan="6" className="px-3 py-10 text-center text-sm text-slate-500">
                                        No league data yet. Complete an experiment to appear here.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
