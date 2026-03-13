import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Beaker,
    Bell,
    Bot,
    ChevronLeft,
    ChevronRight,
    Command,
    FlaskConical,
    Home,
    GraduationCap,
    Menu,
    Monitor,
    Moon,
    NotebookPen,
    Search,
    Sun,
    Trophy,
    User
} from 'lucide-react';
import useThemeStore from '../../store/useThemeStore';
import ProfileDropdown from '../ui/ProfileDropdown';

const primaryNav = [
    { label: 'Dashboard', to: '/dashboard', icon: Home, shortcut: 'D' },
    { label: '2D Lab', to: '/lab2d', icon: Beaker, shortcut: 'L' },
    { label: '3D Lab', to: '/lab', icon: FlaskConical, shortcut: 'L' },
    { label: 'Experiment Lab', to: '/experiment-lab', icon: FlaskConical, shortcut: 'E' },
    { label: 'Learn More', to: '/learn-more', icon: GraduationCap, shortcut: 'M' },
    { label: 'AI Chat', to: '/ai-chemistry-master', icon: Bot, shortcut: 'A' },
    { label: 'Experiments', to: '/experiments', icon: Command, shortcut: 'Ctrl+K' },
    { label: 'Experiment History', to: '/history', icon: NotebookPen, shortcut: '' },
    { label: 'League', to: '/leaderboard', icon: Trophy, shortcut: '' }
];

const sidebarItems = [
    ...primaryNav,
    { label: 'Profile', to: '/profile', icon: User, shortcut: '' }
];

function ShellNavLink({ item, compact = false, onClick }) {
    const Icon = item.icon;
    return (
        <NavLink
            to={item.to}
            onClick={onClick}
            className={({ isActive }) =>
                `group flex items-center ${compact ? 'justify-center' : 'justify-start'} gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${isActive
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30 shadow-[0_8px_24px_rgba(34,211,238,0.2)]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                }`
            }
        >
            <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
            {!compact && <span className="truncate">{item.label}</span>}
        </NavLink>
    );
}

function CommandPalette({ open, onClose, actions, onNavigate }) {
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) setQuery('');
    }, [open]);

    if (!open) return null;

    const normalizedQuery = query.trim().toLowerCase();
    const results = normalizedQuery
        ? actions.filter((action) => action.label.toLowerCase().includes(normalizedQuery))
        : actions;

    return (
        <div className="fixed inset-0 z-[220] flex items-start justify-center bg-black/60 px-4 pt-24" onClick={onClose}>
            <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Jump to lab, AI chat, dashboard..."
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    />
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                    {results.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.to}
                                type="button"
                                onClick={() => {
                                    onNavigate(action.to);
                                    onClose();
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                            >
                                <Icon className="h-4 w-4 text-cyan-300" />
                                <span className="flex-1">{action.label}</span>
                                {!!action.shortcut && <span className="text-[10px] uppercase tracking-wider text-slate-500">{action.shortcut}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function AppShell() {
    const location = useLocation();
    const navigate = useNavigate();
    const { themeMode, setThemeMode, isSidebarCollapsed, toggleSidebarCollapsed } = useThemeStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';

    const commandActions = useMemo(() => sidebarItems, []);
    const isWideContent = location.pathname === '/skills' || location.pathname === '/learn-more';

    useEffect(() => {
        const isTypingTarget = (target) => {
            const tag = target?.tagName?.toLowerCase();
            return tag === 'input' || tag === 'textarea' || target?.isContentEditable;
        };

        const onKeyDown = (event) => {
            if (isTypingTarget(event.target)) return;

            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && key === 'k') {
                event.preventDefault();
                setIsCommandOpen((prev) => !prev);
                return;
            }

            if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
            if (key === 'd') navigate('/dashboard');
            if (key === 'a') navigate('/ai-chemistry-master');
            if (key === 'l') navigate(location.pathname === '/lab' ? '/lab2d' : '/lab');
            if (key === 'm') navigate('/learn-more');
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [location.pathname, navigate]);

    return (
        <div className="relative flex h-full w-full flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
            <div className="ambient-particles" />
            <header className="premium-navbar sticky top-0 z-[120]">
                <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/5 md:hidden"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Open navigation menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-1 py-1">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                            <Beaker className="h-5 w-5" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-black tracking-wide text-white">C-LAB</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Scientist Workspace</p>
                        </div>
                    </Link>

                    <nav className="mx-auto hidden items-center gap-1 lg:flex">
                        {primaryNav.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${isActive
                                        ? 'bg-cyan-500/20 text-cyan-100 shadow-[0_8px_20px_rgba(6,182,212,0.18)]'
                                        : 'text-slate-300 hover:-translate-y-0.5 hover:bg-white/5 hover:text-white'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={() => setIsCommandOpen(true)}
                            className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 md:flex"
                            aria-label="Open command palette"
                        >
                            <Command className="h-3.5 w-3.5" />
                            <span>Command</span>
                            <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">Ctrl+K</span>
                        </button>

                        <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition duration-200 hover:border-cyan-400/40 hover:bg-white/5"
                            onClick={() => setThemeMode(nextTheme)}
                            aria-label={`Switch to ${nextTheme} theme`}
                        >
                            {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </button>

                        <button
                            type="button"
                            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition duration-200 hover:border-cyan-400/40 hover:bg-white/5"
                            aria-label="Notifications"
                        >
                            <Bell className="h-4 w-4" />
                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-400" />
                        </button>

                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            <div className="relative flex min-h-0 flex-1">
                <aside
                    className={`hidden h-full border-r border-white/10 bg-slate-950/60 p-3 backdrop-blur-xl transition-all duration-300 md:flex md:flex-col ${isSidebarCollapsed ? 'w-20' : 'w-72'
                        }`}
                >
                    <div className="mb-2 flex items-center justify-between">
                        {!isSidebarCollapsed && (
                            <p className="px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                Navigation
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={toggleSidebarCollapsed}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
                            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        {sidebarItems.map((item) => (
                            <ShellNavLink key={item.to} item={item} compact={isSidebarCollapsed} />
                        ))}
                    </div>
                </aside>

                <main className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-6">
                    <div key={location.pathname} className={`mx-auto w-full animate-[fadeIn_260ms_ease] ${isWideContent ? 'max-w-[1600px]' : 'max-w-7xl'} px-4 py-6 sm:px-6 lg:px-8`}>
                        <Outlet />
                    </div>
                </main>
            </div>

            <nav className="fixed inset-x-3 bottom-3 z-[130] grid grid-cols-6 gap-2 rounded-2xl border border-white/15 bg-slate-950/90 p-2 backdrop-blur-xl md:hidden">
                {primaryNav.slice(0, 6).map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.to;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${active
                                ? 'bg-cyan-500/20 text-cyan-100 scale-[1.03] shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                                : 'text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </NavLink>
                    );
                })}
            </nav>

            {isMobileMenuOpen && (
                <>
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 z-[140] bg-black/50 md:hidden"
                        aria-label="Close menu overlay"
                    />
                    <aside className="fixed inset-y-0 left-0 z-[150] w-80 border-r border-white/10 bg-slate-950/95 p-4 backdrop-blur-xl md:hidden">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Menu</p>
                            <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400"
                                onClick={() => setIsMobileMenuOpen(false)}
                                aria-label="Close navigation menu"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                            Lab Modes
                        </div>
                        <div className="mt-2 space-y-2">
                            {sidebarItems.map((item) => (
                                <ShellNavLink
                                    key={item.to}
                                    item={item}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                />
                            ))}
                        </div>
                    </aside>
                </>
            )}

            <CommandPalette
                open={isCommandOpen}
                onClose={() => setIsCommandOpen(false)}
                actions={commandActions}
                onNavigate={navigate}
            />
        </div>
    );
}
