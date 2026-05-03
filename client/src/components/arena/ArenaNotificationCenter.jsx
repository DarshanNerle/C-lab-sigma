import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, FlaskConical, Users, X } from 'lucide-react';
import useArenaStore from '../../store/useArenaStore';

const iconForType = (type) => {
    if (type === 'invite' || type === 'join_request') return Users;
    if (type === 'room_complete') return Check;
    return FlaskConical;
};

export default function ArenaNotificationCenter() {
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    const notifications = useArenaStore((state) => state.notifications);
    const invites = useArenaStore((state) => state.invites);
    const respondToInvite = useArenaStore((state) => state.respondToInvite);
    const dismissNotification = useArenaStore((state) => state.dismissNotification);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition duration-200 hover:border-cyan-400/40 hover:bg-white/5"
                aria-label="Notifications"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-slate-950">
                        {Math.min(unreadCount, 9)}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 z-[230] w-[min(92vw,24rem)] rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-1 pb-3">
                        <div>
                            <p className="text-sm font-bold text-white">Arena Notifications</p>
                            <p className="text-xs text-slate-400">Invites, room starts, and match results.</p>
                        </div>
                        <button
                            type="button"
                            className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-white/5"
                            onClick={() => {
                                setIsOpen(false);
                                navigate('/lab-arena');
                            }}
                        >
                            Open
                        </button>
                    </div>

                    <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                        {notifications.map((item) => {
                            const invite = invites.find((entry) => entry.id === item.inviteId);
                            const Icon = iconForType(item.type);

                            return (
                                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-white">{item.title}</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-400">{item.body}</p>
                                            <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                                {new Date(item.createdAt || Date.now()).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="rounded-lg p-1 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
                                            onClick={() => dismissNotification(item.id)}
                                            aria-label="Dismiss notification"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {(item.type === 'invite' || item.type === 'join_request') && invite?.status === 'pending' && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
                                                onClick={async () => {
                                                    try {
                                                        await respondToInvite({ invite, decision: 'accepted' });
                                                        dismissNotification(item.id);
                                                    } catch {
                                                        // arena store surfaces the current user-facing error
                                                    }
                                                }}
                                            >
                                                <Check className="h-3.5 w-3.5" /> {item.type === 'join_request' ? 'Approve' : 'Accept'}
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5"
                                                onClick={async () => {
                                                    try {
                                                        await respondToInvite({ invite, decision: 'declined' });
                                                        dismissNotification(item.id);
                                                    } catch {
                                                        // arena store surfaces the current user-facing error
                                                    }
                                                }}
                                            >
                                                <X className="h-3.5 w-3.5" /> Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {!notifications.length && (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-center">
                                <p className="text-sm font-semibold text-white">Notification center is quiet</p>
                                <p className="mt-1 text-xs text-slate-400">New invites and room updates will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
