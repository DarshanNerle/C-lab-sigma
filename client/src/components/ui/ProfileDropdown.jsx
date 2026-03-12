import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, LogOut, ChevronDown, Settings, 
    Moon, Sun, Volume2, VolumeX, Brain, 
    Zap, Shield, Database, Trash2 
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useGameStore from '../../store/useGameStore';
import useThemeStore from '../../store/useThemeStore';
import useAIStore from '../../store/useAIStore';
import { logoutUser } from '../../firebase/auth';
import { safeLocalStorage, safeSessionStorage } from '../../utils/safeStorage';

import SettingsModal from './SettingsModal';

/**
 * Professional Top Profile Dropdown
 * Features: Level Badge, XP Bar, Toggles, and Logout
 */
export default function ProfileDropdown() {
    const { user, isAuthenticated, clearUser } = useAuthStore();
    const { xp, level, rank, resetGameStats } = useGameStore();
    const { isSoundEnabled, themeMode, toggleSound, setThemeMode } = useThemeStore();
    const { currentMode, setMode } = useAIStore();
    
    const [isOpen, setIsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // XP Calculation for Progress Bar (assume 500 XP per level)
    const nextLevelXP = 500;
    const currentLevelXP = xp % nextLevelXP;
    const xpPercentage = (currentLevelXP / nextLevelXP) * 100;

    const handleLogout = async () => {
        try {
            await logoutUser();
            resetGameStats?.();
            useAIStore.getState().resetAI?.();
            clearUser();
            safeLocalStorage.clear();
            safeSessionStorage.clear();
            setIsOpen(false);
            navigate('/login');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setIsOpen(false);
        setIsSettingsOpen(false);
    }, [location.pathname]);

    return (
        <div className="relative z-[500]" ref={dropdownRef}>
            {/* Main Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-1.5 pr-4 bg-slate-900/40 border border-white/5 rounded-full hover:border-blue-500/30 transition-all active:scale-95 group backdrop-blur-md"
            >
                {/* Circular Avatar */}
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black border-2 border-white/10 overflow-hidden shadow-lg">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            user?.email?.charAt(0).toUpperCase() || '?'
                        )}
                    </div>
                    {/* Level Badge Badge */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-[#0a0f18] flex items-center justify-center text-[9px] font-black text-white shadow-lg">
                        {level}
                    </div>
                </div>

                <div className="hidden sm:flex flex-col items-start leading-none gap-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-200 tracking-wide uppercase">
                            {isAuthenticated ? (user?.displayName || user?.email?.split('@')[0]) : 'Laboratory Guest'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {/* Tiny XP Bar */}
                    <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${xpPercentage}%` }}
                        />
                    </div>
                </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-72 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 overflow-hidden"
                    >
                        {/* Header Info */}
                        <div className="px-4 py-4 border-b border-white/5 mb-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{rank}</span>
                                <span className="text-[10px] text-slate-500">Lvl {level} • {xp} XP</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-blue-500" style={{ width: `${xpPercentage}%` }} />
                            </div>
                        </div>

                        {/* Toggles / Settings Section */}
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-400">
                                        {themeMode === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-300">Theme</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase">{themeMode === 'light' ? 'Light' : 'Dark'}</span>
                            </button>

                            <button
                                onClick={toggleSound}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400">
                                        {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-300">Audio</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase">{isSoundEnabled ? 'On' : 'Off'}</span>
                            </button>

                            <button
                                onClick={() => setMode(currentMode === 'mini_assistant' ? 'full_learning' : 'mini_assistant')}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-purple-400">
                                        <Brain size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-300">AI Mode</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase">{currentMode === 'mini_assistant' ? 'Mini' : 'Full'}</span>
                            </button>
                        </div>

                        {/* Navigation Actions */}
                        <div className="p-2 pt-1 border-t border-white/5 mt-1">
                            <button
                                onClick={() => { setIsOpen(false); setIsSettingsOpen(true); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group"
                            >
                                <Settings size={16} className="text-slate-500 group-hover:text-blue-400" />
                                <span className="text-sm font-bold text-slate-300">Lab Settings</span>
                            </button>

                            <button
                                onClick={() => { setIsOpen(false); navigate('/profile/edit'); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group"
                            >
                                <User size={16} className="text-slate-500 group-hover:text-blue-400" />
                                <span className="text-sm font-bold text-slate-300">Scientist Profile</span>
                            </button>
                            
                            <button
                                onClick={() => { setIsOpen(false); navigate('/dashboard'); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group"
                            >
                                <Zap size={16} className="text-slate-500 group-hover:text-amber-400" />
                                <span className="text-sm font-bold text-slate-300">Achievements</span>
                            </button>
                        </div>

                        {/* Critical Actions */}
                        <div className="p-2 pt-1 border-t border-white/5 mt-1">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-3 text-red-400/80 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all font-black text-[11px] uppercase tracking-widest"
                            >
                                <LogOut size={16} /> Terminate Protocol
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
            />
        </div>
    );
}

