"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import {
    ArrowDownUp,
    BadgeCheck,
    Beaker,
    Calendar,
    FlaskConical,
    Search,
    Timer,
    Users,
    TrendingUp,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HistoryItem {
    id: string;
    experimentName?: string;
    userName?: string;
    result?: string;
    score?: number;
    accuracy?: number;
    duration?: number;
    completedAt?: Date | string | { toDate?: () => Date } | null;
    completedAtDate: Date | null;
    isLocal?: boolean;
}

const toSafeDate = (value: HistoryItem['completedAt'] | Date | null | undefined) => {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        const converted = value.toDate();
        return Number.isNaN(converted.getTime()) ? null : converted;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const scoreBadge = (score = 0) => {
    if (score >= 95) return { label: 'A+', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' };
    if (score >= 90) return { label: 'A', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30' };
    if (score >= 80) return { label: 'B', className: 'bg-blue-500/15 text-blue-300 border-blue-400/30' };
    if (score >= 70) return { label: 'C', className: 'bg-amber-500/15 text-amber-300 border-amber-400/30' };
    return { label: 'D', className: 'bg-rose-500/15 text-rose-300 border-rose-400/30' };
};

const formatDate = (value: Date | null) => {
    if (!value) return { date: '—', relative: '' };
    try {
        const now = new Date();
        const diff = now.getTime() - value.getTime();
        const minutes = Math.floor(diff / 60000);
        
        let relative = '';
        if (minutes < 1) relative = 'Just now';
        else if (minutes < 60) relative = `${minutes}m ago`;
        else if (minutes < 1440) relative = `${Math.floor(minutes / 60)}h ago`;
        else relative = `${Math.floor(minutes / 1440)}d ago`;

        return {
            date: value.toLocaleDateString(),
            time: value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            relative
        };
    } catch {
        return { date: '—', relative: '' };
    }
};

export default function DashboardPage() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterName, setFilterName] = useState('all');
    const [sortKey, setSortKey] = useState<'date' | 'score'>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        const fetchHistory = async () => {
            // Load Local Fallback
            let localData: HistoryItem[] = [];
            try {
                localData = JSON.parse(localStorage.getItem('clab_history_fallback') || '[]');
                localData = localData.map(item => ({
                    ...item,
                    id: item.id || `local-${Math.random().toString(36).substr(2, 9)}`,
                    completedAtDate: toSafeDate(item.completedAt),
                    isLocal: true
                }));
            } catch (e) {
                console.error("Local load failed", e);
            }

            if (!db) {
                setHistory(localData);
                setIsLoading(false);
                return;
            }

            const historyQuery = query(
                collection(db, 'experiment_history'),
                orderBy('completedAt', 'desc')
            );

            const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
                const cloudRows: HistoryItem[] = snapshot.docs.map((doc) => {
                    const data = doc.data() as Omit<HistoryItem, 'id' | 'completedAtDate'>;
                    const completedAt = toSafeDate(data.completedAt);
                    return {
                        id: doc.id,
                        ...data,
                        completedAtDate: completedAt
                    };
                });
                
                // Merge and remove obvious duplicates (by experiment name and roughly the same time)
                const merged = [...cloudRows];
                localData.forEach(local => {
                    const localTime = local.completedAtDate?.getTime() ?? 0;
                    const isDuplicate = cloudRows.some(cloud => 
                        cloud.experimentName === local.experimentName && 
                        Math.abs((cloud.completedAtDate?.getTime() ?? 0) - localTime) < 60000
                    );
                    if (!isDuplicate) {
                        merged.push(local);
                    }
                });

                // Final sort by date
                merged.sort((a, b) => {
                    const dateA = a.completedAtDate ? a.completedAtDate.getTime() : 0;
                    const dateB = b.completedAtDate ? b.completedAtDate.getTime() : 0;
                    return dateB - dateA;
                });

                setHistory(merged);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching history:", error);
                setHistory(localData);
                setIsLoading(false);
            });

            return unsubscribe;
        };

        const unsubscribePromise = fetchHistory();
        return () => {
            unsubscribePromise.then(unsub => unsub && (unsub as any)());
        };
    }, []);

    const experimentOptions = useMemo(() => {
        const names = new Set(history.map((item) => item.experimentName).filter(Boolean));
        return ['all', ...Array.from(names)];
    }, [history]);

    const filteredHistory = useMemo(() => {
        const queryText = search.trim().toLowerCase();
        const items = history.filter((item) => {
            if (filterName !== 'all' && item.experimentName !== filterName) return false;
            if (!queryText) return true;
            return (
                String(item.experimentName || '').toLowerCase().includes(queryText) ||
                String(item.userName || '').toLowerCase().includes(queryText)
            );
        });

        const direction = sortDir === 'asc' ? 1 : -1;
        return [...items].sort((a, b) => {
            if (sortKey === 'score') {
                return ((Number(a.score) || 0) - (Number(b.score) || 0)) * direction;
            }
            const dateA = a.completedAtDate ? a.completedAtDate.getTime() : 0;
            const dateB = b.completedAtDate ? b.completedAtDate.getTime() : 0;
            return (dateA - dateB) * direction;
        });
    }, [filterName, history, search, sortDir, sortKey]);

    const stats = useMemo(() => {
        if (!history.length) return { avgScore: 0, avgAccuracy: 0, total: 0 };
        const totalScore = history.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
        const totalAccuracy = history.reduce((sum, item) => sum + (Number(item.accuracy) || 0), 0);
        return {
            avgScore: Math.round(totalScore / history.length),
            avgAccuracy: Math.round(totalAccuracy / history.length),
            total: history.length
        };
    }, [history]);

    return (
        <div id="dashboard-view" className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-lab-dark text-white font-sans">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-lab-card/30 backdrop-blur-xl border border-lab-border p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-brand-teal/20 rounded-lg border border-brand-teal/30">
                            <FlaskConical className="w-6 h-6 text-brand-teal" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-teal">Scientist Dashboard</span>
                    </div>
                    <h1 className="text-3xl font-heading font-black tracking-tight text-white mb-2">Experiment History</h1>
                    <p className="text-gray-400 text-sm max-w-md">Track your laboratory progress, review past simulations, and monitor your academic performance metrics.</p>
                </div>

                <div className="grid grid-cols-3 gap-4 w-full md:w-auto relative z-10">
                    <StatCard label="Experiments" value={stats.total.toString()} icon={<Beaker className="w-4 h-4" />} />
                    <StatCard label="Avg Score" value={stats.avgScore.toString()} icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} color="text-emerald-400" />
                    <StatCard label="Accuracy" value={stats.avgAccuracy + "%"} icon={<BadgeCheck className="w-4 h-4 text-brand-teal" />} color="text-brand-teal" />
                </div>
            </header>

            {/* Filter Section */}
            <section className="bg-lab-card/20 backdrop-blur-md border border-lab-border p-6 rounded-3xl flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by experiment or student..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-lab-dark/50 border border-lab-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-brand-teal/50 transition-colors outline-none"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="bg-lab-dark/50 border border-lab-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-teal/50 transition-colors"
                    >
                        <option value="all">All Experiments</option>
                        {experimentOptions.filter(o => o !== 'all').map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => {
                            setSortKey('date');
                            setSortDir(sortKey === 'date' && sortDir === 'desc' ? 'asc' : 'desc');
                        }}
                        className={`p-2.5 rounded-xl border border-lab-border hover:bg-lab-highlight transition-all ${sortKey === 'date' ? 'bg-lab-highlight text-brand-teal' : 'text-gray-400'}`}
                        title="Sort by Date"
                    >
                        <Calendar className="w-5 h-5" />
                    </button>
                    
                    <button
                        onClick={() => {
                            setSortKey('score');
                            setSortDir(sortKey === 'score' && sortDir === 'desc' ? 'asc' : 'desc');
                        }}
                        className={`p-2.5 rounded-xl border border-lab-border hover:bg-lab-highlight transition-all ${sortKey === 'score' ? 'bg-lab-highlight text-brand-teal' : 'text-gray-400'}`}
                        title="Sort by Score"
                    >
                        <ArrowDownUp className="w-5 h-5" />
                    </button>
                </div>
            </section>

            {/* Table Section */}
            <div className="bg-lab-card/30 backdrop-blur-md border border-lab-border rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-lab-dark/50 border-b border-lab-border">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Experiment</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Result</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Score</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-lab-border/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" />
                                            <p className="text-sm text-gray-500">Decrypting lab records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <p className="text-sm text-gray-500">No matching lab records found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map((item) => (
                                    <HistoryRow key={item.id} item={item} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color = "text-white" }: { label: string, value: string, icon: React.ReactNode, color?: string }) {
    return (
        <div className="bg-lab-dark/50 border border-lab-border p-4 rounded-2xl flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter">{label}</span>
            </div>
            <span className={`text-xl font-black ${color}`}>{value}</span>
        </div>
    );
}

function HistoryRow({ item }: { item: any }) {
    const badge = scoreBadge(Number(item.score) || 0);
    const dateInfo = formatDate(item.completedAtDate);

    return (
        <tr className="hover:bg-lab-highlight/10 transition-colors group">
            <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal group-hover:scale-110 transition-transform">
                        <FlaskConical className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-white">{item.experimentName || 'Untitled Lab'}</p>
                        <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${badge.className}`}>
                            <BadgeCheck className="w-2.5 h-2.5" />
                            {badge.label}
                        </span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-lab-highlight border border-lab-border flex items-center justify-center text-[11px] font-bold text-brand-purple">
                        {(item.userName || 'S').slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-300 font-medium">{item.userName || 'Student'}</span>
                </div>
            </td>
            <td className="px-6 py-5 max-w-xs">
                <p className="text-xs text-gray-400 line-clamp-1">{item.result || '—'}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 font-medium">
                    <Clock className="w-2.5 h-2.5" />
                    {item.duration || 1} min session
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="text-lg font-black text-brand-teal">{item.score ?? '—'}</div>
                <div className="text-[10px] font-bold text-gray-600 uppercase italic">Accuracy: {item.accuracy ?? 0}%</div>
            </td>
            <td className="px-6 py-5 text-right">
                <p className="text-xs font-bold text-brand-tealAccent">{dateInfo.relative}</p>
                <p className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-tighter">{dateInfo.date}</p>
            </td>
        </tr>
    );
}
