import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Calculator, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ScientificCalculatorPanel from './ScientificCalculatorPanel';

export default function FloatingCalculatorButton() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const isAppShellPage = ['/dashboard', '/lab-arena', '/experiments', '/profile', '/leaderboard', '/history', '/skills', '/learn-more', '/calculator'].some(
        (path) => location.pathname.startsWith(path)
    );

    return (
        <div
            className="pointer-events-none fixed z-[9998] flex flex-col items-start"
            style={{
                left: '1.5rem',
                right: 'auto',
                bottom: isAppShellPage ? '5.5rem' : '1.5rem'
            }}
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                        className="mb-3 pointer-events-auto"
                    >
                        <ScientificCalculatorPanel compact onClose={() => setIsOpen(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 shadow-2xl transition ${isOpen
                    ? 'bg-slate-950 text-cyan-300'
                    : 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white'
                    }`}
                aria-label="Toggle scientific calculator"
            >
                {isOpen ? <X className="h-5 w-5" /> : <Calculator className="h-5 w-5" />}
            </button>
        </div>
    );
}
