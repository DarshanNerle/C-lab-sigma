import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import useAuthStore from '../store/useAuthStore';
import {
    ArrowDownUp,
    BadgeCheck,
    Beaker,
    Calendar,
    FlaskConical,
    Search,
    Timer,
    Users
} from 'lucide-react';

const scoreBadge = (score = 0) => {
    if (score >= 95) return { label: 'A+', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' };
    if (score >= 90) return { label: 'A', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30' };
    if (score >= 80) return { label: 'B', className: 'bg-blue-500/15 text-blue-300 border-blue-400/30' };
    if (score >= 70) return { label: 'C', className: 'bg-amber-500/15 text-amber-300 border-amber-400/30' };
    return { label: 'D', className: 'bg-rose-500/15 text-rose-300 border-rose-400/30' };
};

const formatDate = (value) => {
    if (!value) return { date: '—', relative: '' };
    try {
        const now = new Date();
        const diff = now.getTime() - value.getTime();
        const minutes = Math.floor(diff / 60000);
        
        let relative = '';
        if (minutes < 1) relative = 'Just now';
        else if (minutes < 60) relative = `${minutes} min ago`;
        else if (minutes < 1440) relative = `${Math.floor(minutes / 60)}h ago`;

        return {
            date: value.toLocaleDateString(),
            time: value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            relative
        };
    } catch {
        return { date: '—', relative: '' };
    }
};

export default function History() {
    const { user, isTeacher, isAdmin } = useAuthStore();
    const [history, setHistory] = useState([]);
    const [search, setSearch] = useState('');
    const [filterName, setFilterName] = useState('all');
    const [filterStudent, setFilterStudent] = useState('all');
    const [sortKey, setSortKey] = useState('date');
    const [sortDir, setSortDir] = useState('desc');

    useEffect(() => {
        if (!user?.uid) return;

        let historyQuery;
        if (isAdmin || isTeacher) {
            historyQuery = query(collection(db, 'experiment_history'), orderBy('completedAt', 'desc'));
        } else {
            historyQuery = query(
                collection(db, 'experiment_history'), 
                where('userId', '==', user.uid),
                orderBy('completedAt', 'desc')
            );
        }

        const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
            const rows = snapshot.docs.map((doc) => {
                const data = doc.data();
                const completedAt = data.completedAt?.toDate
                    ? data.completedAt.toDate()
                    : data.completedAt
                        ? new Date(data.completedAt)
                        : null;
                return {
                    id: doc.id,
                    ...data,
                    completedAtDate: completedAt
                };
            });
            setHistory(rows);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const experimentOptions = useMemo(() => {
        const names = new Set(history.map((item) => item.experimentName).filter(Boolean));
        return ['all', ...Array.from(names)];
    }, [history]);

    const studentOptions = useMemo(() => {
        const names = new Set(history.map((item) => item.userName).filter(Boolean));
        return ['all', ...Array.from(names)];
    }, [history]);

    const filteredHistory = useMemo(() => {
        const queryText = search.trim().toLowerCase();
        const items = history.filter((item) => {
            if (filterName !== 'all' && item.experimentName !== filterName) return false;
            if (filterStudent !== 'all' && item.userName !== filterStudent) return false;
            if (!queryText) return true;
            const chemicals = Array.isArray(item.chemicalsUsed) ? item.chemicalsUsed.join(' ') : '';
            return (
                String(item.experimentName || '').toLowerCase().includes(queryText)
                || String(item.result || '').toLowerCase().includes(queryText)
                || String(chemicals || '').toLowerCase().includes(queryText)
                || String(item.userName || '').toLowerCase().includes(queryText)
            );
        });

        const direction = sortDir === 'asc' ? 1 : -1;
        return [...items].sort((a, b) => {
            if (sortKey === 'score') {
                const diff = (Number(a.score) || 0) - (Number(b.score) || 0);
                return diff * direction;
            }
            const dateA = a.completedAtDate ? a.completedAtDate.getTime() : 0;
            const dateB = b.completedAtDate ? b.completedAtDate.getTime() : 0;
            return (dateA - dateB) * direction;
        });
    }, [filterName, filterStudent, history, search, sortDir, sortKey]);

    const averageScore = useMemo(() => {
        if (!history.length) return 0;
        const total = history.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
        return Math.round(total / history.length);
    }, [history]);

    const averageAccuracy = useMemo(() => {
        if (!history.length) return 0;
        const total = history.reduce((sum, item) => sum + (Number(item.accuracy) || 0), 0);
        return Math.round(total / history.length);
    }, [history]);

    return (
        <div className="w-full space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-[0_16px_40px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <FlaskConical className="h-7 w-7 text-cyan-400" />
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Experiment History</h1>
                            <p className="mt-1 text-sm text-slate-400">Review every experiment, score, and recorded observation.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Experiments</p>
                            <p className="text-lg font-black text-white">{history.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Avg Score</p>
                            <p className="text-lg font-black text-emerald-300">{averageScore}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Accuracy</p>
                            <p className="text-lg font-black text-cyan-300">{averageAccuracy}%</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.6)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search experiment, chemical, or result..."
                            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                        />
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                        <Beaker className="h-4 w-4 text-slate-400" />
                        <select
                            value={filterName}
                            onChange={(event) => setFilterName(event.target.value)}
                            className="bg-transparent text-sm text-white outline-none"
                        >
                            {experimentOptions.map((name) => (
                                <option key={name} value={name}>
                                    {name === 'all' ? 'All Experiments' : name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                        <Users className="h-4 w-4 text-slate-400" />
                        <select
                            value={filterStudent}
                            onChange={(event) => setFilterStudent(event.target.value)}
                            className="bg-transparent text-sm text-white outline-none"
                        >
                            {studentOptions.map((name) => (
                                <option key={name} value={name}>
                                    {name === 'all' ? 'All Students' : name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            setSortKey('score');
                            setSortDir(sortKey === 'score' && sortDir === 'desc' ? 'asc' : 'desc');
                        }}
                        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200"
                    >
                        <ArrowDownUp className="h-4 w-4 text-slate-400" />
                        Sort Score
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSortKey('date');
                            setSortDir(sortKey === 'date' && sortDir === 'desc' ? 'asc' : 'desc');
                        }}
                        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200"
                    >
                        <Calendar className="h-4 w-4 text-slate-400" />
                        Sort Date
                    </button>
                </div>

                <div className="mt-5 overflow-x-auto">
                    <table className="min-w-[900px] w-full border-separate border-spacing-0 text-left text-sm">
                        <thead>
                            <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                <th className="py-3 px-3">Experiment</th>
                                <th className="py-3 px-3">Student</th>
                                <th className="py-3 px-3">Chemicals</th>
                                <th className="py-3 px-3">Result</th>
                                <th className="py-3 px-3">Score</th>
                                <th className="py-3 px-3">Accuracy</th>
                                <th className="py-3 px-3">Duration</th>
                                <th className="py-3 px-3">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.map((item) => {
                                const badge = scoreBadge(Number(item.score) || 0);
                                return (
                                    <tr key={item.id} className="border-t border-white/5 text-slate-200">
                                        <td className="px-3 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                                                    <FlaskConical className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white">{item.experimentName || 'Untitled Experiment'}</p>
                                                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${badge.className}`}>
                                                        <BadgeCheck className="h-3 w-3" />
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-[11px] font-bold text-slate-200">
                                                    {(item.userName || 'S').slice(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{item.userName || 'Student'}</p>
                                                    <p className="text-xs text-slate-500">{item.userId || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(Array.isArray(item.chemicalsUsed) ? item.chemicalsUsed : []).slice(0, 3).map((chem) => (
                                                    <span key={chem} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200">
                                                        {chem}
                                                    </span>
                                                ))}
                                                {(Array.isArray(item.chemicalsUsed) && item.chemicalsUsed.length > 3) && (
                                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                                                        +{item.chemicalsUsed.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 text-slate-300">
                                            <p className="max-w-[280px] text-sm text-slate-200">{item.result || '—'}</p>
                                            <p className="mt-2 text-xs text-slate-500">{item.observation || 'No observation recorded.'}</p>
                                        </td>
                                        <td className="px-3 py-4 text-lg font-bold text-emerald-300">{item.score ?? '—'}</td>
                                        <td className="px-3 py-4 text-sm text-cyan-200">{Number(item.accuracy) ? `${item.accuracy}%` : '—'}</td>
                                        <td className="px-3 py-4 text-sm text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Timer className="h-4 w-4 text-slate-500" />
                                                {item.duration ? `${item.duration} min` : '—'}
                                            </div>
                                        </td>
                                         <td className="px-3 py-4 text-sm text-slate-400">
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium">{formatDate(item.completedAtDate).relative || formatDate(item.completedAtDate).time}</span>
                                                <span className="text-[10px] opacity-60 uppercase tracking-tight">{formatDate(item.completedAtDate).date}</span>
                                            </div>
                                         </td>
                                    </tr>
                                );
                            })}
                            {!filteredHistory.length && (
                                <tr>
                                    <td colSpan="8" className="px-3 py-10 text-center text-sm text-slate-500">
                                        No experiments recorded yet. Complete an experiment to see it here.
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
