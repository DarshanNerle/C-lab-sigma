"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, X, MessageSquare, CheckCircle2, ClipboardCheck } from 'lucide-react';

interface LabFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { rating: number; feedback: string }) => void;
    labName: string;
}

export function LabFeedbackModal({ isOpen, onClose, onSubmit, labName }: LabFeedbackModalProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmitInternal = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => {
            onSubmit({ rating, feedback });
            setSubmitted(false);
            setRating(0);
            setFeedback('');
        }, 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-lab-dark/95 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-lab-card border border-lab-border rounded-[2rem] overflow-hidden shadow-2xl z-10"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-teal to-transparent opacity-50" />
                        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-brand-teal/10 via-brand-purple/5 to-transparent pointer-events-none" />
                        
                        <div className="p-8 relative">
                            <button 
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-lab-border"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex flex-col items-center text-center mb-8">
                                <motion.div 
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="w-16 h-16 bg-brand-teal/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-teal/20 shadow-xl"
                                >
                                    <ClipboardCheck className="w-8 h-8 text-brand-teal" />
                                </motion.div>
                                <h2 className="text-2xl font-heading font-black text-white tracking-tight mb-2 uppercase italic italic">Protocol Complete</h2>
                                <p className="text-gray-400 text-sm max-w-[80%]">How would you rate the <strong className="text-brand-teal">{labName || 'Laboratory'}</strong> simulation?</p>
                            </div>

                            {!submitted ? (
                                <form onSubmit={handleSubmitInternal} className="space-y-6">
                                    {/* Star Rating Interface */}
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className="group relative transition-transform active:scale-95"
                                                    onMouseEnter={() => setHover(star)}
                                                    onMouseLeave={() => setHover(0)}
                                                    onClick={() => setRating(star)}
                                                >
                                                    <Star 
                                                        className={`w-10 h-10 transition-all duration-300 ${
                                                            (hover || rating) >= star 
                                                            ? 'fill-brand-teal text-brand-teal drop-shadow-[0_0_8px_rgba(0,212,170,0.4)]' 
                                                            : 'text-lab-dark border border-gray-100 group-hover:text-gray-600'
                                                        }`} 
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <div className="h-4">
                                            <AnimatePresence mode="wait">
                                                <motion.span 
                                                    key={hover || rating}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                    className="text-[10px] font-bold text-brand-teal uppercase tracking-[0.3em]"
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
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 ml-1">
                                            <MessageSquare className="w-3 h-3 text-gray-500" />
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Laboratory Notes</label>
                                        </div>
                                        <textarea
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            placeholder="Document any observations or technical difficulties..."
                                            className="w-full h-24 bg-lab-dark/50 border border-lab-border rounded-2xl p-4 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-brand-teal/30 transition-all resize-none shadow-inner group"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={rating === 0}
                                        className={`group relative w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 transition-all overflow-hidden ${
                                            rating === 0 
                                            ? 'bg-lab-card/50 text-gray-600 cursor-not-allowed border border-lab-border' 
                                            : 'bg-brand-teal text-lab-dark hover:bg-brand-tealAccent shadow-lg shadow-brand-teal/20'
                                        }`}
                                    >
                                        <Send className="w-4 h-4 relative z-10" />
                                        <span className="relative z-10">Archive Record</span>
                                    </button>
                                </form>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center py-6"
                                >
                                    <div className="relative">
                                        <motion.div 
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute inset-0 bg-brand-teal blur-2xl rounded-full"
                                        />
                                        <div className="relative w-20 h-20 bg-brand-teal/10 rounded-full flex items-center justify-center mb-6 border border-brand-teal/20 backdrop-blur-md">
                                            <CheckCircle2 className="w-10 h-10 text-brand-teal" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-heading font-black text-white uppercase tracking-[0.2em] italic">Data Synced</h3>
                                    <p className="text-gray-400 text-sm mt-2 text-center">Laboratory records have been successfully<br />archived in the C-Lab ledger.</p>
                                    
                                    <div className="w-full max-w-[150px] h-1.5 bg-lab-highlight rounded-full mt-8 overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 1.5, ease: "circOut" }}
                                            className="h-full bg-brand-teal"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            <div className="mt-8 pt-4 border-t border-lab-border text-center flex flex-col items-center gap-2">
                                <span className="px-3 py-1 bg-lab-highlight rounded-full text-[8px] font-bold text-gray-500 uppercase tracking-widest border border-lab-border italic">
                                    Secure Ledger Transmission
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
