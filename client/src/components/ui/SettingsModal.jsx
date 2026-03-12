import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Volume2, VolumeX, Zap, Brain, Shield, Info, Loader2 } from 'lucide-react';
import useThemeStore from '../../store/useThemeStore';
import useAIStore from '../../store/useAIStore';
import useAuthStore from '../../store/useAuthStore';
import useVoiceStore from '../../store/useVoiceStore';
import { voiceManager } from '../../utils/VoiceManager';
import { storageService } from '../../lib/storageService';

/**
 * Advanced Settings Modal
 * Clean, professional interface for laboratory configuration.
 */
export default function SettingsModal({ isOpen, onClose }) {
    const {
        isSoundEnabled,
        soundVolume,
        immersiveMode,
        animationIntensity,
        themeMode,
        toggleSound,
        setSoundVolume,
        toggleImmersiveMode,
        setAnimationIntensity,
        setThemeMode
    } = useThemeStore();
    const { userLevel, setUserLevel } = useAIStore();
    const { voiceEnabled, speechRate, speechPitch, selectedVoice, voiceGender, setVoiceEnabled, setSpeechRate, setSpeechPitch, setSelectedVoice, setVoiceGender } = useVoiceStore();
    const { user } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [isDragEnabled, setIsDragEnabled] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragStateRef = useRef(null);

    const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];

    useEffect(() => {
        const loadVoices = () => {
            if (typeof window === 'undefined' || !window.speechSynthesis) return;
            setAvailableVoices(window.speechSynthesis.getVoices() || []);
        };
        loadVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        setDragOffset({ x: 0, y: 0 });
        setIsDragEnabled(false);
    }, [isOpen]);

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', stopDrag);
        };
    }, []);

    const startDrag = (event) => {
        if (!isDragEnabled) return;
        event.preventDefault();
        dragStateRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: dragOffset.x,
            originY: dragOffset.y
        };
        window.addEventListener('mousemove', handleDrag);
        window.addEventListener('mouseup', stopDrag);
    };

    const handleDrag = (event) => {
        const state = dragStateRef.current;
        if (!state) return;
        const nextX = state.originX + (event.clientX - state.startX);
        const nextY = state.originY + (event.clientY - state.startY);
        setDragOffset({ x: nextX, y: nextY });
    };

    const stopDrag = () => {
        dragStateRef.current = null;
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', stopDrag);
    };

    const handleApply = async () => {
        if (!user?.email) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            await storageService.updateSettings({
                email: user.email,
                settings: {
                    darkMode: themeMode !== 'light',
                    theme: themeMode === 'light' ? 'light' : 'dark',
                    soundEnabled: isSoundEnabled,
                    soundVolume: soundVolume,
                    immersiveMode: immersiveMode,
                    aiMode: useAIStore.getState().currentMode,
                    animationIntensity,
                    voiceEnabled,
                    speechRate,
                    speechPitch,
                    selectedVoice,
                    voiceGender
                }
            });
            onClose();
        } catch (error) {
            console.error("Failed to save settings:", error);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestVoice = () => {
        voiceManager.setRate(speechRate);
        voiceManager.setPitch(speechPitch);
        voiceManager.setVoice(selectedVoice);
        voiceManager.setVoiceByGender(voiceGender);
        voiceManager.speak('Hello, I am your AI assistant.');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="absolute left-1/2 top-1/2 w-full max-w-lg max-h-[80vh] -translate-x-1/2 -translate-y-1/2 bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ transform: `translate(-50%, -50%) translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
                    >
                        {/* Header */}
                        <div
                            onDoubleClick={() => setIsDragEnabled((prev) => !prev)}
                            onMouseDown={startDrag}
                            className={`px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5 ${isDragEnabled ? 'cursor-move' : 'cursor-default'}`}
                            title="Double-click to toggle drag"
                        >
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter">System Configuration</h2>
                                <p className="text-xs text-slate-400 mt-1">Adjust laboratory parameters and interface behavior.</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Settings Body */}
                        <div className="p-8 space-y-8 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                            
                            {/* Visual & Audio */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={12} /> Interface & Atmosphere
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                                        className="flex flex-col items-start p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-400 mb-3">
                                            {themeMode === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                                        </div>
                                        <span className="text-sm font-bold text-white">Visual Theme</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-black">{themeMode}</span>
                                    </button>

                                    <div className="flex flex-col items-start p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all text-left group">
                                        <div className="flex items-center justify-between w-full mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400">
                                                {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                            </div>
                                            <button onClick={toggleSound} className={`w-10 h-5 rounded-full relative transition-colors ${isSoundEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${isSoundEnabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        <span className="text-sm font-bold text-white">Audio Feedback</span>
                                        <input 
                                            type="range" 
                                            min="0" max="1" step="0.01" 
                                            value={soundVolume}
                                            onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                                            className="w-full mt-2 accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="text-sm font-bold text-white">Immersive Lab Ambience</p>
                                        <p className="text-[10px] text-slate-500">Subtle background sounds for deep focus.</p>
                                    </div>
                                    <button 
                                        onClick={() => toggleImmersiveMode()}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${immersiveMode ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${immersiveMode ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <Brain size={12} /> Voice Interface
                                </h3>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="text-sm font-bold text-white">AI Voice Output</p>
                                        <p className="text-[10px] text-slate-500">Read AI responses aloud automatically.</p>
                                    </div>
                                    <button
                                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${voiceEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${voiceEnabled ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                    <label className="text-xs font-bold text-slate-300">Speech Rate: {speechRate.toFixed(2)}</label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2"
                                        step="0.05"
                                        value={speechRate}
                                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                        className="w-full accent-emerald-500"
                                    />
                                    <label className="text-xs font-bold text-slate-300">Speech Pitch: {speechPitch.toFixed(2)}</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.05"
                                        value={speechPitch}
                                        onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                                        className="w-full accent-emerald-500"
                                    />
                                    <label className="text-xs font-bold text-slate-300">Voice</label>
                                    <select
                                        value={selectedVoice}
                                        onChange={(e) => setSelectedVoice(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs"
                                    >
                                        <option value="">Default Voice</option>
                                        {availableVoices.map((v) => (
                                            <option key={v.name} value={v.name}>
                                                {v.name} ({v.lang})
                                            </option>
                                        ))}
                                    </select>
                                    <label className="text-xs font-bold text-slate-300">Voice Gender</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['male', 'female', 'auto'].map((gender) => (
                                            <button
                                                key={gender}
                                                type="button"
                                                onClick={() => setVoiceGender(gender)}
                                                className={`px-2 py-2 rounded-lg text-[10px] uppercase font-black border ${voiceGender === gender ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                            >
                                                {gender}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleTestVoice}
                                        className="w-full px-3 py-2 rounded-lg text-xs font-bold border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        Test Voice
                                    </button>
                                </div>
                            </section>

                            {/* AI & Academic */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                    <Brain size={12} /> AI Cognition & Difficulty
                                </h3>
                                
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-300">Lab Difficulty Mode</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {difficultyLevels.map(lvl => (
                                            <button
                                                key={lvl}
                                                onClick={() => setUserLevel(lvl)}
                                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                                    userLevel === lvl 
                                                    ? 'bg-purple-600 border-purple-400 text-white' 
                                                    : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'
                                                }`}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 mt-2">
                                        <Info size={14} className="text-blue-400 mt-0.5" />
                                        <p className="text-[10px] text-slate-400 leading-relaxed">
                                            Higher difficulty modes provide less guidance and require more precise chemical measurements and procedure adherence.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Advanced Options */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                    <Shield size={12} /> Performance & Security
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div>
                                            <p className="text-sm font-bold text-white">Animation Intensity</p>
                                            <p className="text-[10px] text-slate-500">Reduce visual effects for better performance.</p>
                                        </div>
                                        <button
                                            onClick={() => setAnimationIntensity(animationIntensity === 'reduced' ? 'normal' : 'reduced')}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${animationIntensity === 'reduced' ? 'bg-blue-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${animationIntensity === 'reduced' ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div>
                                            <p className="text-sm font-bold text-white">Auto-Save Reports</p>
                                            <p className="text-[10px] text-slate-500">Automatically save lab progress to cloud.</p>
                                        </div>
                                        <input type="checkbox" className="w-10 h-5 bg-slate-700 rounded-full appearance-none checked:bg-green-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-all checked:after:left-6" defaultChecked />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 bg-white/5 border-t border-white/5 flex justify-end">
                            <button 
                                onClick={handleApply}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                                {isSaving ? 'Synchronizing...' : 'Apply Changes'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
