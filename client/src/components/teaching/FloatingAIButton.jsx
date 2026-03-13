import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAIStore from '../../store/useAIStore';
import useAuthStore from '../../store/useAuthStore';
import useVoiceStore from '../../store/useVoiceStore';
import { AIController } from '../../modules/teaching/AIController';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, Volume2, Bot, RotateCcw, X, Wand2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { voiceManager } from '../../utils/VoiceManager';
import useThemeStore from '../../store/useThemeStore';
import { safeLocalStorage } from '../../utils/safeStorage';

/**
 * FloatingAIButton - MODE 1: Floating AI Assistant (Mini Copilot)
 * Appears as a small circular button in the bottom-right corner.
 */
const FloatingAIButton = () => {
    const {
        isMiniOpen,
        toggleMiniAssistant,
        miniChatHistory,
        addChatMessage,
        currentPage,
        setCurrentPage,
        userLevel,
        setMode
    } = useAIStore();

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [micError, setMicError] = useState('');
    const chatEndRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { voiceEnabled, speechRate, speechPitch, selectedVoice, voiceGender, isSpeaking, setIsSpeaking, toggleVoice } = useVoiceStore();
    const { isSidebarCollapsed } = useThemeStore();

    // --- Position Persistence ---
    const [position, setPosition] = useState(null);
    const dragInfo = useRef({ active: false, hasMoved: false });

    // Load persisted position with safety check & bounds validation
    useEffect(() => {
        const saved = safeLocalStorage.getItem('c_lab_ai_pos');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.x !== undefined && parsed.y !== undefined) {
                    const maxX = window.innerWidth - 80;
                    const maxY = window.innerHeight - 80;
                    const safeX = Math.max(10, Math.min(parsed.x, maxX));
                    const safeY = Math.max(10, Math.min(parsed.y, maxY));
                    setPosition({ x: safeX, y: safeY });
                }
            } catch (e) {
                console.error("Failed to load AI position", e);
            }
        }

        // Rescue Shortcut: Ctrl+Alt+A to Reset Bot Position
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
                setPosition(null);
                safeLocalStorage.removeItem('c_lab_ai_pos');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Save position safely
    useEffect(() => {
        if (position) {
            safeLocalStorage.setItem('c_lab_ai_pos', JSON.stringify(position));
        } else if (position === null) {
            safeLocalStorage.removeItem('c_lab_ai_pos');
        }
    }, [position]);

    // Determine if on a page with a sidebar
    const isAppShellPage = ['/dashboard', '/experiments', '/profile', '/leaderboard', '/history', '/skills', '/learn-more'].some(p => location.pathname.startsWith(p));
    const isLab2D = location.pathname.startsWith('/lab2d');

    // Sync current page with store
    useEffect(() => {
        const path = location.pathname;
        let pageName = 'Home';
        if (path.includes('lab2d')) pageName = '2D Lab';
        else if (path.includes('lab')) pageName = '3D Lab';
        else if (path.includes('experiments')) pageName = 'Experiments';
        else if (path.includes('learn-more')) pageName = 'Learn More';
        else if (path.includes('quiz')) pageName = 'Quiz Page';

        setCurrentPage(pageName);
    }, [location.pathname, setCurrentPage]);

    // Proactive help suggestion
    useEffect(() => {
        if (miniChatHistory.length > 2) return; // Only suggest for new sessions

        const timer = setTimeout(() => {
            if (!isMiniOpen) {
                addChatMessage({
                    role: 'assistant',
                    content: `Hey! I noticed you are exploring the ${currentPage} section. Need help understanding any concepts here?`
                }, 'mini_assistant');
            }
        }, 15000); // 15 seconds of exploration

        return () => clearTimeout(timer);
    }, [currentPage, isMiniOpen, miniChatHistory.length, addChatMessage]);

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [miniChatHistory, isMiniOpen]);

    useEffect(() => {
        voiceManager.setRate(speechRate);
        voiceManager.setPitch(speechPitch);
        voiceManager.setVoice(selectedVoice);
        voiceManager.setVoiceByGender(voiceGender);
        const unsubscribe = voiceManager.onStateChange((value) => setIsSpeaking(value));
        return () => {
            unsubscribe();
        };
    }, [speechRate, speechPitch, selectedVoice, voiceGender, setIsSpeaking]);

    const speakResponse = async (text) => {
        if (!voiceEnabled) return;
        const plain = String(text || '').replace(/[#>*_`]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!plain) return;
        voiceManager.setRate(speechRate);
        voiceManager.setPitch(speechPitch);
        voiceManager.setVoice(selectedVoice);
        voiceManager.setVoiceByGender(voiceGender);
        voiceManager.speak(plain);
    };

    const stopSpeaking = () => {
        voiceManager.stop();
        setIsSpeaking(false);
    };

    const toggleMic = async () => {
        setMicError('');
        const { speechRecognitionManager } = await import('../../utils/SpeechRecognitionManager');
        if (isListening) {
            speechRecognitionManager.stop();
            setIsListening(false);
            return;
        }

        speechRecognitionManager.start({
            onStart: () => setIsListening(true),
            onResult: (text) => setInput(text),
            onEnd: () => setIsListening(false),
            onError: (message) => {
                setMicError(message);
                setIsListening(false);
            }
        });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;
        setErrorText('');

        const userMsg = { role: 'user', content: input };
        addChatMessage(userMsg, 'mini_assistant');
        const currentInput = input;
        setInput('');
        setIsTyping(true);

        const userEmail = useAuthStore.getState().user?.email || null;

        try {
            const response = await AIController.sendMessage({
                message: currentInput,
                context: currentPage,
                level: userLevel,
                mode: 'mini_assistant',
                userEmail
            });

            addChatMessage({ role: 'assistant', content: response }, 'mini_assistant');
            await speakResponse(response);
        } catch (error) {
            const safeMessage = error?.message || 'AI is currently unavailable.';
            setErrorText(safeMessage);
            addChatMessage({ role: 'assistant', content: `**AI Error:** ${safeMessage}` }, 'mini_assistant');
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div
            style={position ? {
                left: position.x,
                top: position.y,
                bottom: 'auto',
                right: 'auto',
                position: 'fixed'
            } : {
                bottom: isAppShellPage ? '5.5rem' : '1.5rem',
                right: '1.5rem',
                left: 'auto',
                top: 'auto',
                position: 'fixed'
            }}
            className="z-[9999] p-2 pointer-events-none flex flex-col items-end"
        >
            {/* Chat Popup */}
            <AnimatePresence>
                {isMiniOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mb-4 h-[500px] w-[350px] glass-sheen rounded-2xl border border-white/20 bg-slate-950/95 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-white flex justify-between items-center shadow-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🧪</span>
                                <div>
                                    <h3 className="text-sm font-bold">Chemistry Master</h3>
                                    <p className="text-[10px] opacity-80">Mini Assistant • {currentPage}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPosition(null)}
                                    title="Reset Position"
                                    className="hover:bg-white/20 p-2 rounded-lg transition-colors text-white/90"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={toggleMiniAssistant}
                                    className="hover:bg-white/20 p-2 rounded-lg transition-colors text-white/90"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/50">
                            {miniChatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                        ? 'bg-cyan-600 text-white rounded-br-none'
                                        : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none shadow-inner'
                                        }`}>
                                        <div className="prose prose-invert prose-sm max-w-none break-words">
                                            <ReactMarkdown>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-none flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-100"></span>
                                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            )}
                            {!!errorText && (
                                <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                                    {errorText}
                                </div>
                            )}
                            {!!micError && (
                                <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                                    {micError}
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Footer Controls */}
                        <div className="p-3 border-t border-slate-800 flex flex-col gap-2 bg-slate-900/50">
                            {miniChatHistory.length > 5 && (
                                <motion.button
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    onClick={() => {
                                        setMode('full_learning');
                                        toggleMiniAssistant();
                                        navigate('/ai-chemistry-master');
                                    }}
                                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:scale-[1.02] transition-all"
                                >
                                    ✨ Deep Discussion? Open Full AI
                                </motion.button>
                            )}

                            <button
                                onClick={() => {
                                    setMode('full_learning');
                                    toggleMiniAssistant();
                                    navigate('/ai-chemistry-master');
                                }}
                                className="text-[10px] py-1 px-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full hover:bg-cyan-500/20 transition-all text-center uppercase tracking-wider font-bold"
                            >
                                🚀 Expand to Full AI Learning Mode
                            </button>

                            <div className="flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={toggleVoice}
                                    className={`text-[10px] px-2 py-1 rounded-lg border ${voiceEnabled ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-slate-400 border-slate-700 bg-slate-800/60'}`}
                                >
                                    <Volume2 className="w-3.5 h-3.5 inline mr-1" />
                                    Voice {voiceEnabled ? 'On' : 'Off'}
                                </button>
                                <button
                                    type="button"
                                    onClick={stopSpeaking}
                                    className="text-[10px] px-2 py-1 rounded-lg border border-rose-500/40 text-rose-300 bg-rose-500/10"
                                >
                                    <Square className="w-3.5 h-3.5 inline mr-1" />
                                    Stop
                                </button>
                            </div>

                            {isSpeaking && (
                                <div className="flex items-end gap-1 h-4 px-2">
                                    <span className="w-1 h-2 bg-emerald-400 rounded animate-pulse" />
                                    <span className="w-1 h-4 bg-emerald-300 rounded animate-pulse [animation-delay:80ms]" />
                                    <span className="w-1 h-3 bg-emerald-400 rounded animate-pulse [animation-delay:160ms]" />
                                    <span className="text-[10px] text-emerald-300 ml-1">Speaking...</span>
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    disabled={isTyping}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={toggleMic}
                                    className={`p-2 rounded-xl text-white transition-colors ${isListening ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                                >
                                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isTyping || !input.trim()}
                                    className="bg-cyan-600 hover:bg-cyan-500 p-2 rounded-xl text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19 l9 2 -9 -18 -9 18 9 -2 z m0 0 v-8" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button with Pure Framer Motion Drag */}
            <motion.div
                drag
                dragMomentum={false}
                dragConstraints={{
                    top: 10,
                    left: 10,
                    right: window.innerWidth - 70,
                    bottom: window.innerHeight - 70
                }}
                onDragStart={() => {
                    dragInfo.current.active = true;
                    dragInfo.current.hasMoved = false;
                }}
                onDrag={() => {
                    dragInfo.current.hasMoved = true;
                }}
                onDragEnd={(event, info) => {
                    dragInfo.current.active = false;
                    const newPos = {
                        x: info.point.x - 28, // Offset to center the button
                        y: info.point.y - 28
                    };
                    setPosition(newPos);
                    // Minimal delay to ensure hasMoved is false for subsequent taps
                    setTimeout(() => {
                        dragInfo.current.hasMoved = false;
                    }, 50);
                }}
                whileHover={{ scale: 1.15, rotate: isMiniOpen ? 90 : 5 }}
                whileTap={{ scale: 0.9 }}
                className={`group relative w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-2xl cursor-grab active:cursor-grabbing pointer-events-auto ${isMiniOpen
                    ? 'bg-slate-900 border-2 border-cyan-400 text-cyan-400 shadow-cyan-500/30'
                    : 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-blue-500/20'
                    }`}
                onTap={() => {
                    if (!dragInfo.current.hasMoved) {
                        toggleMiniAssistant();
                    }
                    dragInfo.current.hasMoved = false;
                }}
            >
                {/* Glow Pulse Effect */}
                {!isMiniOpen && (
                    <motion.div
                        animate={{
                            opacity: [0.2, 0.4, 0.2],
                            scale: [1, 1.3, 1],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute inset-0 rounded-full bg-cyan-400/40 blur-xl z-0"
                    />
                )}

                <div className="relative z-10">
                    {isMiniOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
                </div>

                {!isMiniOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-white shadow-sm"></span>
                    </span>
                )}

                {/* Tooltip */}
                {!isMiniOpen && (
                    <div className="absolute right-full mr-4 px-4 py-2 bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-2xl translate-x-2 group-hover:translate-x-0">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-0.5">Professor AI Bot</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-tighter">Drag anywhere to move</span>
                        </div>
                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-slate-950/95" />
                    </div>
                )}
            </motion.div>
        </div>

    );
};

export default FloatingAIButton;
