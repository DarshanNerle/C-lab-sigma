import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../../utils/soundManager';
import LabFeedbackModal from './LabFeedbackModal';

/**
 * LabSessionController - Handles the start/end flow of a lab session
 * with a timer and a feedback modal (Google Cloud Skills style).
 */
export default function LabSessionController({ 
    onStart, 
    onEnd, 
    durationMinutes = 60,
    labName = "Virtual Chemistry Lab",
    isActive: externalActive = false
}) {
    const [isActive, setIsActive] = useState(externalActive);
    const [isPaused, setIsPaused] = useState(false);
    const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
    const [showConfirmEnd, setShowConfirmEnd] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const timerRef = useRef(null);

    // Sync internal isActive with external prop
    useEffect(() => {
        if (externalActive && !isActive) {
            setIsActive(true);
            setIsPaused(false);
            setTimeLeft(durationMinutes * 60);
        } else if (!externalActive && isActive) {
            setIsActive(false);
            setIsPaused(false);
        }
    }, [externalActive]);

    useEffect(() => {
        if (isActive && !isPaused && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft <= 0 && isActive && !isPaused) {
            handleRequestEnd();
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, isPaused, timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartSession = () => {
        setIsActive(true);
        setIsPaused(false);
        setTimeLeft(durationMinutes * 60);
        soundManager.play('success');
        if (onStart) onStart();
    };

    const handleRequestEnd = () => {
        setIsPaused(true);
        setShowConfirmEnd(false);
        setShowFeedbackModal(true);
    };

    const handleCancelEnd = () => {
        setIsPaused(false);
        setShowConfirmEnd(false);
    }

    const handleFinalSubmit = (feedbackData) => {
        setIsActive(false);
        setIsPaused(false);
        setShowFeedbackModal(false);
        soundManager.play('clink');
        if (onEnd) {
            onEnd({ 
                timeSpent: durationMinutes * 60 - timeLeft,
                feedback: feedbackData 
            });
        }
    };

    return (
        <>
            <div className="flex items-center gap-4">
                <AnimatePresence mode="wait">
                    {!isActive ? (
                        <motion.button
                            key="start-btn"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={handleStartSession}
                            className="group relative flex items-center gap-3 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl overflow-hidden shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/40 transition-all active:scale-95"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                            <Play className="w-5 h-5 fill-current text-white group-hover:animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Start Lab</span>
                            
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute -inset-2 border border-emerald-400/20 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100"
                            />
                        </motion.button>
                    ) : (
                        <motion.div
                            key="active-session"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-2 shadow-2xl"
                        >
                            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                                <motion.div
                                    animate={timeLeft < 300 ? { scale: [1, 1.1, 1], color: ['#fff', '#f87171', '#fff'] } : {}}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="flex items-center gap-2"
                                >
                                    <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-red-400' : 'text-neon-cyan'}`} />
                                    <span className={`font-mono text-xl font-black ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                        {formatTime(timeLeft)}
                                    </span>
                                </motion.div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest hidden md:block">Session Time</span>
                            </div>

                            <div className="relative">
                                {!showConfirmEnd ? (
                                    <button
                                        onClick={() => setShowConfirmEnd(true)}
                                        className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors py-1 shadow-sm"
                                    >
                                        <Square className="w-4 h-4 fill-current" />
                                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">End Lab</span>
                                    </button>
                                ) : (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl p-1 whitespace-nowrap z-[1000] shadow-2xl">
                                        <span className="text-[9px] font-bold text-slate-400 px-2 uppercase">Confirm End?</span>
                                        <button
                                            onClick={handleRequestEnd}
                                            className="px-3 py-1 bg-rose-600 rounded-lg text-[10px] font-black uppercase text-white hover:bg-rose-500 transition-colors"
                                        >
                                            Yes, End
                                        </button>
                                        <button
                                            onClick={handleCancelEnd}
                                            className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black uppercase text-slate-300 hover:bg-slate-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <LabFeedbackModal 
                isOpen={showFeedbackModal} 
                onClose={() => {
                    setShowFeedbackModal(false);
                    // If they didn't finish, unpause (unless timeLeft is 0)
                    if (timeLeft > 0) setIsPaused(false);
                }}
                onSubmit={handleFinalSubmit}
                labName={labName}
            />
        </>
    );
}
