import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAIStore from '../../store/useAIStore';
import useAuthStore from '../../store/useAuthStore';
import useVoiceStore from '../../store/useVoiceStore';
import useLabStore from '../../store/useLabStore';
import { AIController } from '../../modules/teaching/AIController';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Mic, MicOff, Square, Volume2, Bot, X, Wand2, Sparkles, 
    FileText, FlaskConical, Settings, MessageSquare, BarChart3, Activity, 
    Droplets, Lightbulb, RotateCcw, Trash2 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { voiceManager } from '../../utils/VoiceManager';
import { safeLocalStorage } from '../../utils/safeStorage';

/**
 * FloatingAIButton - High-fidelity AI Chemistry Assistant
 * Designed for professional global deployment (based on Cloned Master).
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
        setUserLevel
    } = useAIStore();

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activeTab, setActiveTab] = useState('assistant'); // 'assistant', 'tools', 'data'
    const [errorText, setErrorText] = useState('');
    const [currentGreeting, setCurrentGreeting] = useState("AI Master Protocols Active");
    const [isListening, setIsListening] = useState(false);
    
    const recognitionRef = useRef(null);
    const chatEndRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const { 
        voiceEnabled, speechRate, speechPitch, selectedVoice, 
        voiceGender, isSpeaking, setIsSpeaking, toggleVoice 
    } = useVoiceStore();
    
    const { actionTimeline, containers, resetLab } = useLabStore();
    const { user } = useAuthStore();
    const userEmail = user?.email;

    const isAppShellPage = ['/dashboard', '/experiments', '/profile', '/leaderboard', '/history', '/skills', '/learn-more', '/calculator'].some(p => location.pathname.startsWith(p));
    const isLabPage = location.pathname.includes('/lab');

    // Default position matches the calculator's layout
    const defaultBottom = isAppShellPage ? '5.5rem' : '1.5rem';
    const defaultRight = '1.5rem';

    // Persisted Position
    const [position, setPosition] = useState(null);
    const [viewport, setViewport] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800
    });
    const dragInfo = useRef({ active: false, hasMoved: false });

    useEffect(() => {
        const saved = safeLocalStorage.getItem('c_lab_ai_pos');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.x !== undefined && parsed.y !== undefined) {
                    const maxX = window.innerWidth - 60;
                    const maxY = window.innerHeight - 60;
                    setPosition({ 
                        x: Math.max(10, Math.min(parsed.x, maxX)), 
                        y: Math.max(10, Math.min(parsed.y, maxY)) 
                    });
                }
            } catch (e) { /* ignored */ }
        }
        const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (position) safeLocalStorage.setItem('c_lab_ai_pos', JSON.stringify(position));
    }, [position]);

    // Greeting cycle
    useEffect(() => {
        const greetings = [
            "Need help? I'm here!",
            "Master, how can I assist?",
            "Analyzing experiment data...",
            "Where are you? I will help you!",
            "Knowledge Protocols Online"
        ];
        let i = 0;
        const interval = setInterval(() => {
            setCurrentGreeting(greetings[i % greetings.length]);
            i++;
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Voice recognition setup
    useEffect(() => {
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.onresult = (e) => {
                setInput(e.results[0][0].transcript);
                setIsListening(false);
            };
            recognitionRef.current.onend = () => setIsListening(false);
        }
    }, []);

    // Sync state for voice manager
    useEffect(() => {
        const unsubscribe = voiceManager.onStateChange((speaking) => setIsSpeaking(speaking));
        return () => unsubscribe();
    }, [setIsSpeaking]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [miniChatHistory, isMiniOpen]);

    useEffect(() => {
        const path = location.pathname;
        let p = 'Home';
        if (path.includes('lab2d')) p = '2D Lab';
        else if (path.includes('lab')) p = '3D Lab';
        else if (path.includes('experiments')) p = 'Experiments Library';
        else if (path.includes('learn-more')) p = 'Knowledge Base';
        setCurrentPage(p);
    }, [location.pathname, setCurrentPage]);

    const toggleMic = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setIsListening(true);
            recognitionRef.current.start();
        }
    };

    const stopSpeaking = () => {
        voiceManager.stop();
        setIsSpeaking(false);
    };

    const handleVoiceToggle = () => {
        const nextEnabled = !voiceEnabled;
        toggleVoice();
        if (!nextEnabled) {
            stopSpeaking();
            return;
        }
        try {
            voiceManager.ensureVoiceLoading?.();
            voiceManager.setRate(speechRate);
            voiceManager.setPitch(speechPitch);
            voiceManager.setVoice(selectedVoice);
            voiceManager.setVoiceByGender(voiceGender);
            voiceManager.speakImmediate?.('Voice enabled.');
        } catch (err) { /* ignored */ }
    };

    const speakResponse = async (text) => {
        if (!voiceEnabled) return;
        const plain = String(text || '').replace(/[#>*_`]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!plain) return;
        
        voiceManager.setRate(speechRate);
        voiceManager.setPitch(speechPitch);
        voiceManager.setVoice(selectedVoice);
        voiceManager.setVoiceByGender(voiceGender);
        const ok = voiceManager.speak(plain);
        if (!ok) setErrorText('Voice error. Toggle Voice ON to unlock.');
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isTyping) return;
        
        setErrorText('');
        addChatMessage({ role: 'user', content: trimmed }, 'mini_assistant');
        setInput('');
        setIsTyping(true);

        try {
            const labContext = isLabPage ? `Current lab containers: ${Object.keys(containers).join(', ')}. Action history: ${actionTimeline.slice(-5).map(a => a.type).join(', ')}` : '';
            const res = await AIController.sendMessage({
                message: trimmed,
                context: `Page: ${currentPage}. ${labContext}`,
                level: userLevel,
                mode: 'mini_assistant',
                userEmail
            });
            addChatMessage({ role: 'assistant', content: res }, 'mini_assistant');
            if (voiceEnabled) await speakResponse(res);
        } catch (err) {
            console.error('[AI:Submit] Error:', err);
            setErrorText(err.message || 'Interlink failure. Please retry.');
            // Add a graceful system message
            addChatMessage({ role: 'assistant', content: '⚠️ **System Sync Error**: My neural interface is experiencing interference. Please re-establish connection and try again.' }, 'mini_assistant');
        } finally {
            setIsTyping(false);
        }
    };

    const handlePredictor = async () => {
        setActiveTab('assistant');
        setIsTyping(true);
        const q = '🔮 Predict outcome based on current laboratory state.';
        addChatMessage({ role: 'user', content: q }, 'mini_assistant');
        
        const prompt = `PREDICTOR MODE. Context: ${currentPage}. Lab Actions: ${actionTimeline.slice(-5).map(a => a.type).join(', ')}. Academic: ${userLevel}.`;
        try {
            const res = await AIController.sendMessage({
                message: prompt,
                context: currentPage,
                level: userLevel,
                mode: 'mini_assistant',
                userEmail
            });
            addChatMessage({ role: 'assistant', content: res }, 'mini_assistant');
            await speakResponse(res);
        } catch (err) { setErrorText('Data synthesis failed.'); }
        finally { setIsTyping(false); }
    };

    const popupWidth = Math.max(280, Math.min(380, viewport.width - 40));
    const popupHeight = Math.max(320, Math.min(550, viewport.height - 140));

    return (
        <div
            style={position ? { left: position.x, top: position.y, position: 'fixed' } : { bottom: defaultBottom, right: defaultRight, position: 'fixed' }}
            className="z-[9999] pointer-events-none"
        >
            <AnimatePresence>
                {isMiniOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.9 }}
                        style={{ width: popupWidth, height: popupHeight }}
                        className="absolute bottom-[calc(100%+20px)] right-0 rounded-[2.5rem] border border-white/20 bg-slate-950/90 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex flex-col overflow-hidden pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-cyan-500/20 p-2 rounded-xl">
                                    <Bot className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">C-Lab Master</h3>
                                    <p className="text-[8px] text-cyan-400 font-bold uppercase">{currentPage}</p>
                                </div>
                            </div>
                            <button onClick={toggleMiniAssistant} className="p-2 hover:bg-white/10 rounded-xl text-slate-400"><X className="w-4 h-4" /></button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex bg-white/5 p-1 mx-4 mt-4 rounded-2xl border border-white/5">
                            {[
                                { id: 'assistant', label: 'Instructor', icon: MessageSquare },
                                { id: 'tools', label: 'Tools', icon: Activity },
                                { id: 'data', label: 'Lab Status', icon: BarChart3, hidden: !isLabPage }
                            ].filter(t => !t.hidden).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                        activeTab === tab.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {activeTab === 'assistant' && (
                                    <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                        {miniChatHistory.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[11px] ${
                                                    msg.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'
                                                }`}>
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                        {isTyping && (
                                            <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white/5 w-fit">
                                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </motion.div>
                                )}

                                {activeTab === 'tools' && (
                                    <motion.div key="tools" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Master Controls</h4>
                                        <button onClick={handlePredictor} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-cyan-500/10 transition-all flex items-center gap-4 group">
                                            <FlaskConical className="w-5 h-5 text-cyan-400" />
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-white">Reaction Predictor</p>
                                                <p className="text-[9px] text-slate-500">Scan reagents for likely outcomes</p>
                                            </div>
                                        </button>
                                        <button onClick={() => navigate('/ai-chemistry-master')} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-indigo-500/10 transition-all flex items-center gap-4">
                                            <Sparkles className="w-5 h-5 text-indigo-400" />
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-white">Assessment Mode</p>
                                                <p className="text-[9px] text-slate-500">Take high-stakes chemistry quizzes</p>
                                            </div>
                                        </button>
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            <button onClick={handleVoiceToggle} className={`p-3 rounded-2xl border transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${voiceEnabled ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                                <Volume2 className="w-4 h-4" /> {voiceEnabled ? 'Voice ON' : 'Voice OFF'}
                                            </button>
                                            <button onClick={() => { stopSpeaking(); if(voiceEnabled) handleVoiceToggle(); }} className="p-3 rounded-2xl border bg-rose-500/10 border-rose-500/40 text-rose-400 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                                <MicOff className="w-4 h-4" /> Sound Off
                                            </button>
                                        </div>

                                        <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                                            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-2"><Settings className="w-3 h-3" /> Expertise Level</p>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {['Middle School', 'High School', 'Undergraduate', 'Professional'].map(lvl => (
                                                    <button 
                                                        key={lvl} 
                                                        onClick={() => setUserLevel(lvl)}
                                                        className={`py-2 px-1 rounded-lg text-[8px] font-bold border transition-all ${userLevel === lvl ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-white/5 text-slate-500 hover:border-white/20'}`}
                                                    >
                                                        {lvl}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'data' && (
                                    <motion.div key="data" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-slate-300">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Telemetry</h4>
                                            <button onClick={resetLab} className="text-[8px] font-bold text-rose-400 hover:underline flex items-center gap-1"><RotateCcw className="w-3 h-3" /> RESET LAB</button>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
                                            <p className="text-xs font-bold mb-3 text-cyan-400">Current Setup</p>
                                            <div className="space-y-2">
                                                {Object.values(containers).filter(c => c.volume > 0).map(c => (
                                                    <div key={c.id} className="flex items-center justify-between text-[10px] bg-white/5 p-2 rounded-xl">
                                                        <span className="uppercase font-black text-slate-400">{c.id}</span>
                                                        <span className="text-white font-mono">{c.volume.toFixed(1)}mL / {c.temp.toFixed(1)}°C</span>
                                                    </div>
                                                ))}
                                                {Object.values(containers).every(c => c.volume === 0) && <p className="text-[10px] text-slate-500 italic">No reagents detected.</p>}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Input Area */}
                        {activeTab === 'assistant' && (
                            <div className="p-4 bg-slate-950/50 border-t border-white/10">
                                <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={isListening ? "Listening..." : "Consult AI Master..."}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                                    />
                                    <div className="absolute right-2 flex items-center gap-1">
                                        <button type="button" onClick={toggleMic} className={`p-2 rounded-xl transition-all ${isListening ? 'bg-cyan-500 text-white animate-pulse' : 'text-slate-500 hover:text-white'}`}>
                                            <Mic className="w-4 h-4" />
                                        </button>
                                        <button type="submit" disabled={isTyping || !input.trim()} className="p-2 bg-cyan-600 text-white rounded-xl disabled:opacity-30">
                                            <Wand2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                                {errorText && <p className="text-[8px] text-rose-400 mt-2 font-bold uppercase tracking-widest text-center">{errorText}</p>}
                                {isSpeaking && (
                                    <button onClick={stopSpeaking} className="mt-3 w-full py-1.5 bg-rose-500/20 text-rose-400 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                        <Square className="w-2.5 h-2.5" /> Stop Speaking
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Trigger Button - Optimized Circular Gradient with Scanline */}
            <motion.div
                drag
                dragMomentum={false}
                dragConstraints={{ top: 10, left: 10, right: viewport.width - 60, bottom: viewport.height - 60 }}
                onDragEnd={(e, info) => setPosition({ x: info.point.x - 24, y: info.point.y - 24 })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onTap={() => { toggleMiniAssistant(); }}
                className={`w-14 h-14 rounded-full border border-white/30 shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center justify-center pointer-events-auto cursor-pointer transition-all overflow-hidden relative group ${
                    isMiniOpen ? 'bg-slate-900 border-cyan-400' : 'bg-slate-950'
                }`}
            >
                {/* Background Animation */}
                {!isMiniOpen && (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-indigo-700/20 animate-pulse" />
                )}
                
                {/* Scanline Effect */}
                {!isMiniOpen && (
                    <motion.div 
                        animate={{ y: [-60, 60] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-x-0 h-[2px] bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.8)] z-10"
                    />
                )}

                <div className="relative z-20">
                    {isMiniOpen ? <X className="w-6 h-6 text-cyan-400" /> : <Bot className="w-7 h-7 text-cyan-400 group-hover:text-white transition-colors" />}
                    {isSpeaking && <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }} transition={{ duration: 1, repeat: Infinity }} className="absolute -inset-2 bg-cyan-400/40 rounded-full" />}
                </div>
 
                {/* Greeting Bubble */}
                {!isMiniOpen && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        className="absolute right-full mr-4 whitespace-nowrap bg-slate-950/90 border border-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-xl shadow-2xl"
                    >
                        <p className="text-[10px] font-black text-white flex items-center gap-2 uppercase tracking-widest">
                            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                            {currentGreeting}
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default FloatingAIButton;
