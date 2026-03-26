import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, X, MessageSquare, CheckCircle2, ClipboardCheck } from 'lucide-react';

/**
 * LabFeedbackModal - High-fidelity feedback interface
 * Optimized for C-Lab Master aesthetics
 */
export default function LabFeedbackModal({ isOpen, onClose, onSubmit, labName }) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmitInternal = (e) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => {
            onSubmit({ rating, feedback });
            setSubmitted(false);
            setRating(0);
            setFeedback('');
        }, 2000);
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                    {/* Backdrop with extreme blur and dark tint */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-[12px]"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(20px)' }}
                        className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.3)] z-10"
                    >
                        {/* Futuristic Header Accent */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
                        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent pointer-events-none" />
                        
                        <div className="p-10 relative">
                            <button 
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex flex-col items-center text-center mb-10">
                                <motion.div 
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
                                >
                                    <ClipboardCheck className="w-10 h-10 text-indigo-400" />
                                </motion.div>
                                <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-3">Protocol Complete</h2>
                                <p className="text-slate-400 text-sm max-w-[80%]">How would you rate your performance in <strong className="text-indigo-400">{labName || 'the laboratory'}</strong>?</p>
                            </div>

                            {!submitted ? (
                                <form onSubmit={handleSubmitInternal} className="space-y-8">
                                    {/* Star Rating Interface */}
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex gap-3">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className="group relative transition-transform active:scale-90"
                                                    onMouseEnter={() => setHover(star)}
                                                    onMouseLeave={() => setHover(0)}
                                                    onClick={() => setRating(star)}
                                                >
                                                    <Star 
                                                        className={`w-12 h-12 transition-all duration-300 ${
                                                            (hover || rating) >= star 
                                                            ? 'fill-indigo-400 text-indigo-400 drop-shadow-[0_0_12px_rgba(129,140,248,0.6)]' 
                                                            : 'text-slate-800 group-hover:text-slate-600'
                                                        }`} 
                                                    />
                                                    {(hover === star || (rating === star && hover === 0)) && (
                                                        <motion.div 
                                                            layoutId="rating-bg"
                                                            className="absolute -inset-2 bg-indigo-400/5 rounded-2xl blur-md -z-10" 
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="h-6">
                                            <AnimatePresence mode="wait">
                                                <motion.span 
                                                    key={hover || rating}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                    className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]"
                                                >
                                                    {hover === 1 || (!hover && rating === 1) ? "Insufficient" : ""}
                                                    {hover === 2 || (!hover && rating === 2) ? "Practical" : ""}
                                                    {hover === 3 || (!hover && rating === 3) ? "Competent" : ""}
                                                    {hover === 4 || (!hover && rating === 4) ? "Professional" : ""}
                                                    {hover === 5 || (!hover && rating === 5) ? "Master Level" : ""}
                                                </motion.span>
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Additional Insight Input */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 ml-1">
                                            <MessageSquare className="w-3 h-3 text-slate-500" />
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Laboratory Notes</label>
                                        </div>
                                        <textarea
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            placeholder="Document any observations or technical difficulties..."
                                            className="w-full h-32 bg-slate-950/50 border border-white/5 rounded-3xl p-5 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/30 transition-all resize-none shadow-inner group"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={rating === 0}
                                        className={`group relative w-full h-16 rounded-3xl font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4 transition-all overflow-hidden ${
                                            rating === 0 
                                            ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5' 
                                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_15px_30px_rgba(79,70,229,0.3)]'
                                        }`}
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                                        <Send className="w-4 h-4 relative z-10" />
                                        <span className="relative z-10">Sync Reports</span>
                                    </button>
                                </form>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center py-10"
                                >
                                    <div className="relative">
                                        <motion.div 
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute inset-0 bg-emerald-500 blur-2xl rounded-full"
                                        />
                                        <div className="relative w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 backdrop-blur-md">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em]">Data Synced</h3>
                                    <p className="text-slate-400 text-sm mt-3 text-center">Laboratory records have been successfully<br />archived in the C-Lab Master ledger.</p>
                                    
                                    <div className="w-full max-w-[200px] h-1.5 bg-slate-800 rounded-full mt-10 overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 1.5, ease: "circOut" }}
                                            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            <div className="mt-12 pt-6 border-t border-white/5 text-center flex flex-col items-center gap-2">
                                <span className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest border border-white/5">
                                    Secure Transfer Active
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
