import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import useAIStore from '../store/useAIStore';
import useVoiceStore from '../store/useVoiceStore';
import useLabStore from '../store/useLabStore';
import useNotebookStore from '../store/useNotebookStore';
import { AIController } from '../modules/teaching/AIController';
import GlassCard from '../components/ui/GlassCard';
import { voiceManager } from '../utils/VoiceManager';
import {
    Book,
    Binary,
    RefreshCcw,
    Trophy,
    FileText,
    Brain,
    ChevronRight,
    Send,
    History,
    Menu,
    X,
    ClipboardList,
    Mic,
    MicOff,
    Square,
    Volume2,
    FlaskConical
} from 'lucide-react';

/**
 * AIChemistryMaster - MODE 2: Full AI Learning Section
 * Dedicated page for deep learning, quizzes, and structured chemistry tuition.
 */
const AIChemistryMaster = () => {
    const {
        fullChatHistory,
        addChatMessage,
        userLevel,
        setUserLevel,
        currentTopic,
        setCurrentTopic,
        progress,
        clearHistory
    } = useAIStore();

    const {
        isTeacher,
        isAdmin
    } = useAuthStore();
    const { actionTimeline } = useLabStore();

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [micError, setMicError] = useState('');
    const [selectedMode, setSelectedMode] = useState('learn'); // 'learn' | 'quiz' | 'revision' | 'predictor' | 'teacher_tools'
    const [aiPersonality, setAIPersonality] = useState('Friendly Tutor');
    const [explanationDepth, setExplanationDepth] = useState('Medium');
    const [voiceMood, setVoiceMood] = useState('Professional');
    const [studyPreset, setStudyPreset] = useState('Standard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const chatEndRef = useRef(null);
    const { voiceEnabled, speechRate, speechPitch, selectedVoice, voiceGender, isSpeaking, setIsSpeaking, toggleVoice } = useVoiceStore();

    const topics = [
        'General Chemistry',
        'Atomic Structure',
        'Chemical Bonding',
        'Thermodynamics',
        'Organic Chemistry',
        'Electrochemistry',
        'Acids & Bases'
    ];

    const levels = ['Middle School', 'High School', 'Undergraduate', 'Professional'];

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [fullChatHistory]);

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
        if (!voiceManager.isSupported?.()) {
            setErrorText('Voice output is not supported in this browser.');
            return;
        }
        const plain = String(text || '').replace(/[#>*_`]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!plain) return;
        voiceManager.setRate(speechRate);
        voiceManager.setPitch(speechPitch);
        voiceManager.setVoice(selectedVoice);
        voiceManager.setVoiceByGender(voiceGender);
        const ok = voiceManager.speak(plain);
        if (!ok) setErrorText('Voice output was blocked. Toggle Voice ON to unlock.');
    };

    const handleVoiceToggle = () => {
        const nextEnabled = !voiceEnabled;
        toggleVoice();

        if (!nextEnabled) {
            stopSpeaking();
            return;
        }

        if (!voiceManager.isSupported?.()) {
            setErrorText('Voice output is not supported in this browser.');
            return;
        }

        try {
            voiceManager.ensureVoiceLoading?.();
            if (window.speechSynthesis?.paused) {
                window.speechSynthesis.resume();
            }
            voiceManager.setRate(speechRate);
            voiceManager.setPitch(speechPitch);
            voiceManager.setVoice(selectedVoice);
            voiceManager.setVoiceByGender(voiceGender);
            voiceManager.speakImmediate?.('Voice enabled. You will hear AI responses now.');
        } catch (err) {
            setErrorText(err?.message || 'Unable to start voice output.');
        }
    };

    const stopSpeaking = () => {
        voiceManager.stop();
        setIsSpeaking(false);
    };

    const toggleMic = async () => {
        setMicError('');
        const { speechRecognitionManager } = await import('../utils/SpeechRecognitionManager');

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
        setMicError('');

        const userMsg = { role: 'user', content: input };
        addChatMessage(userMsg, 'full_learning');
        const currentInput = input;
        setInput('');
        setIsTyping(true);

        const userEmail = useAuthStore.getState().user?.email || null;

        const recentLabMemory = actionTimeline.slice(-4).map((step) => `${step.type}:${step.containerId || step.targetId || ''}`).join(', ');
        const composedInput = [
            `AI Personality: ${aiPersonality}.`,
            `Study Mode: ${selectedMode}.`,
            selectedMode === 'predictor' ? "CRITICAL: You are C-LAB AI, an advanced Chemistry Professor. For this reaction prediction, provide a structured response with exactly these sections: 1. Title (Reaction Name & Branch), 2. Definition (1-2 sentences), 3. General Reaction (Balanced Equation), 4. Reaction Explanation (Step-by-step bullet points), 5. Observations (Expected visual changes, bubbles, etc.), 6. Practical Application, 7. Safety Note. Use Markdown for formatting." : "",
            `Study Preset: ${studyPreset}.`,
            `Explanation Depth: ${explanationDepth}.`,
            `Voice Mood: ${voiceMood}.`,
            recentLabMemory ? `Recent Lab Context: ${recentLabMemory}.` : '',
            `User Prompt: ${currentInput}`
        ].filter(Boolean).join(' ');

        try {
            addChatMessage({ role: 'assistant', content: '' }, 'full_learning');
            const response = await AIController.sendMessage({
                message: composedInput,
                context: currentTopic,
                level: userLevel,
                mode: 'full_learning',
                userEmail,
                onChunk: (text) => {
                    useAIStore.getState().updateLastChatMessage(text, 'full_learning');
                }
            });

            await speakResponse(response);
        } catch (error) {
            const safeMessage = error?.message || 'AI is currently unavailable.';
            setErrorText(safeMessage);
            addChatMessage({ role: 'assistant', content: `**AI Error:** ${safeMessage}` }, 'full_learning');
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex-1 w-full bg-[#0a0f18] text-white flex flex-col md:flex-row overflow-hidden relative">
            {/* Mobile Menu Toggle */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden fixed top-20 right-4 z-[100] p-3 bg-purple-600 rounded-full shadow-lg"
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Left Sidebar - Controls */}
            <div className={`
                fixed md:relative inset-y-0 left-0 z-[90] w-80 border-r border-slate-800 bg-slate-900/95 md:bg-slate-900/50 p-6 flex flex-col gap-8 overflow-y-auto transition-transform duration-300
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                        🧠
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                            AI Master
                        </h1>
                        <p className="text-xs text-slate-400">Level: {userLevel}</p>
                    </div>
                </div>

                {/* Level Selector */}
                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Academic Level</label>
                    <div className="grid grid-cols-1 gap-2">
                        {levels.map(l => (
                            <button
                                key={l}
                                onClick={() => setUserLevel(l)}
                                className={`px-4 py-2 rounded-lg text-sm text-left transition-all ${userLevel === l
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                                    }`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Topic Selector */}
                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Current Topic</label>
                    <select
                        value={currentTopic}
                        onChange={(e) => setCurrentTopic(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                    >
                        {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {/* Mode Selector */}
                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Study Mode</label>
                    <div className="flex flex-col gap-2">
                        {[
                            { id: 'learn', label: 'Learn Concept', icon: <Book size={18} /> },
                            { id: 'predictor', label: 'Reaction Predictor', icon: <FlaskConical size={18} /> },
                            { id: 'quiz', label: 'Start Quiz', icon: <FileText size={18} /> },
                            { id: 'revision', label: 'Revision Mode', icon: <RefreshCcw size={18} /> }
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => {
                                    setSelectedMode(m.id);
                                    if (window.innerWidth < 768) setSidebarOpen(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${selectedMode === m.id
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-800/30 text-slate-400 hover:bg-slate-800'
                                    }`}
                            >
                                {m.icon}
                                <span className="font-medium text-sm">{m.label}</span>
                            </button>
                        ))}

                        {(isTeacher || isAdmin) && (
                            <button
                                onClick={() => {
                                    setSelectedMode('teacher_tools');
                                    if (window.innerWidth < 768) setSidebarOpen(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-2 border border-purple-500/30 ${selectedMode === 'teacher_tools'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-purple-900/10 text-purple-400 hover:bg-purple-900/20'
                                    }`}
                            >
                                <ClipboardList size={18} />
                                <span className="font-medium text-sm">Instructor Tools</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">AI Personality</label>
                    <select
                        value={aiPersonality}
                        onChange={(e) => setAIPersonality(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                    >
                        <option>Friendly Tutor</option>
                        <option>Strict Teacher</option>
                        <option>Scientific Expert</option>
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Study Preset</label>
                    <select
                        value={studyPreset}
                        onChange={(e) => setStudyPreset(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                    >
                        <option>Standard</option>
                        <option>Explain Like I&apos;m 12</option>
                        <option>Exam Mode</option>
                        <option>Step-by-Step Mode</option>
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Explanation Depth</label>
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="1"
                        value={explanationDepth === 'Short' ? 1 : explanationDepth === 'Medium' ? 2 : 3}
                        onChange={(e) => setExplanationDepth(Number(e.target.value) === 1 ? 'Short' : Number(e.target.value) === 2 ? 'Medium' : 'Detailed')}
                        className="w-full accent-purple-500"
                    />
                    <p className="text-xs text-slate-400">{explanationDepth}</p>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Voice Mood</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['Calm', 'Energetic', 'Professional'].map((mood) => (
                            <button
                                key={mood}
                                onClick={() => setVoiceMood(mood)}
                                className={`rounded-lg px-2 py-2 text-xs transition ${voiceMood === mood ? 'bg-purple-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}
                            >
                                {mood}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Progress Tracker */}
                <div className="mt-auto p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl">
                    <h4 className="text-xs font-bold text-slate-300 mb-4 uppercase">Learning Progress</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Lessons Completed</span>
                            <span className="text-purple-400">{progress.lessonsCompleted}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: '15%' }}></div>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Mastery Score</span>
                            <span className="text-indigo-400">{progress.averageScore}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Chat Interface */}
            <div className="flex-1 flex flex-col bg-[#0d131f]">
                {/* Chat Top Bar */}
                <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/20">
                    <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedMode === 'learn' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            selectedMode === 'quiz' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                selectedMode === 'teacher_tools' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                    selectedMode === 'predictor' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                        'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                            Mode: {selectedMode.replace('_', ' ')}
                        </div>
                        <h2 className="text-sm font-semibold text-slate-300">Active Topic: {currentTopic}</h2>
                    </div>
                    <button
                        onClick={() => clearHistory('full_learning')}
                        className="text-xs text-slate-500 hover:text-white transition-colors"
                    >
                        Clear History
                    </button>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                    {selectedMode === 'predictor' ? (
                        <div className="max-w-xl mx-auto py-12">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-slate-800/40 p-10 rounded-3xl border border-cyan-400/20 shadow-2xl backdrop-blur-xl"
                            >
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-400/30">
                                        <FlaskConical className="text-cyan-400 w-8 h-8" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white">Reaction Predictor</h2>
                                    <p className="text-slate-400 text-sm mt-2">What chemicals are you mixing today, Scientist?</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-cyan-400 tracking-widest pl-1">Reactants / Mixture</label>
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="e.g. Copper Sulfate + Sodium Hydroxide"
                                            className="w-full bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isTyping || !input.trim()}
                                        className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-cyan-900/30 hover:scale-[1.02] active:scale-95 transition-all text-white"
                                    >
                                        {isTyping ? 'Analyzing Elements...' : 'Predict Outcome'}
                                    </button>

                                    <div className="mt-8 pt-6 border-t border-slate-700/30">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mb-4">Popular Predictions</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { label: 'Acid-Base', query: 'HCl + NaOH' },
                                                { label: 'Redox', query: 'Copper + Nitric Acid' },
                                                { label: 'Precipitation', query: 'AgNO3 + NaCl' },
                                                { label: 'Combustion', query: 'Methane + Oxygen' }
                                            ].map((ex) => (
                                                <button
                                                    key={ex.label}
                                                    onClick={() => setInput(ex.query)}
                                                    className="text-[10px] bg-slate-900/50 hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-400 px-3 py-2 rounded-lg border border-slate-700 hover:border-cyan-500/30 transition-all"
                                                >
                                                    {ex.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    ) : fullChatHistory.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                            <div className="text-6xl mb-6">⚗️</div>
                            <h2 className="text-2xl font-bold mb-2">Ready to Master Chemistry?</h2>
                            <p className="text-slate-400">
                                I&apos;m your advanced AI mentor. Select a topic and mode, or just start asking deep questions about chemical reactions, thermodynamics, or bonding.
                            </p>
                        </div>
                    )}

                    {selectedMode === 'predictor' && fullChatHistory.length > 0 && (
                        <div className="pb-8">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                                <History className="w-4 h-4" /> Previous Predictions
                            </h2>
                        </div>
                    )}

                    {fullChatHistory.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg ${msg.role === 'user' ? 'bg-slate-700' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                    }`}>
                                    {msg.role === 'user' ? '👤' : '🧪'}
                                </div>
                                <div className={`p-5 rounded-3xl relative group ${msg.role === 'user'
                                    ? 'bg-slate-800 text-slate-200 rounded-tr-none'
                                    : selectedMode === 'predictor'
                                        ? 'bg-gradient-to-br from-[#1a2133] to-[#0f172a] text-slate-100 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.05)] rounded-tl-none'
                                        : 'bg-[#1a2133] text-slate-100 border border-slate-700/50 shadow-xl rounded-tl-none'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        msg.content
                                    ) : (
                                        <>
                                            <div className="prose prose-invert prose-sm max-w-none break-words">
                                                <ReactMarkdown>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>

                                            {/* Action Buttons for AI Response */}
                                            <div className="absolute -bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(msg.content);
                                                        // Simple feedback could be added here
                                                    }}
                                                    className="bg-slate-800 border border-slate-700 p-1.5 rounded-lg text-[10px] text-slate-400 hover:text-white flex items-center gap-1 shadow-lg"
                                                    title="Copy to Clipboard"
                                                >
                                                    <FileText size={12} /> Copy
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        useNotebookStore.getState().addLog(`AI REACTION PREDICTION: ${msg.content.split('\n')[0]}`);
                                                        alert("Saved to Lab Notebook!");
                                                    }}
                                                    className="bg-slate-800 border border-slate-700 p-1.5 rounded-lg text-[10px] text-slate-400 hover:text-white flex items-center gap-1 shadow-lg"
                                                    title="Save to Lab Notebook"
                                                >
                                                    <Book size={12} /> Save
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">🧪</div>
                            <div className="bg-[#1a2133] p-4 rounded-2xl flex gap-2">
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150"></span>
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-300"></span>
                            </div>
                        </div>
                    )}
                    {!!errorText && (
                        <div className="max-w-4xl mx-auto text-[12px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                            {errorText}
                        </div>
                    )}
                    {!!micError && (
                        <div className="max-w-4xl mx-auto text-[12px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                            {micError}
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-8 bg-slate-900/40 border-t border-slate-800">
                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-4 bg-slate-800/50 p-2 rounded-2xl border border-slate-700 focus-within:border-purple-500/50 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Ask a question about ${currentTopic}...`}
                            disabled={isTyping}
                            className="flex-1 bg-transparent border-none px-4 py-3 text-white focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={toggleMic}
                            className={`px-3 rounded-xl ${isListening ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-700 hover:bg-slate-600'} text-white transition-colors`}
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                        <button
                            type="submit"
                            disabled={isTyping || !input.trim()}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2"
                        >
                            <span>{isTyping ? 'Sending...' : 'Send'}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19 l9 2 -9 -18 -9 18 9 -2 z m0 0 v-8" />
                            </svg>
                        </button>
                    </form>
                    <div className="max-w-4xl mx-auto mt-3 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleVoiceToggle}
                            className={`text-[11px] px-3 py-1.5 rounded-lg border ${voiceEnabled ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-slate-400 border-slate-700 bg-slate-800/60'}`}
                        >
                            <Volume2 className="w-3.5 h-3.5 inline mr-1" />
                            Voice {voiceEnabled ? 'On' : 'Off'}
                        </button>
                        <button
                            type="button"
                            onClick={stopSpeaking}
                            className="text-[11px] px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 bg-rose-500/10"
                        >
                            <Square className="w-3.5 h-3.5 inline mr-1" />
                            Stop Speaking
                        </button>
                        {isSpeaking && (
                            <div className="flex items-end gap-1 h-4 px-2">
                                <span className="w-1 h-2 bg-emerald-400 rounded animate-pulse" />
                                <span className="w-1 h-4 bg-emerald-300 rounded animate-pulse [animation-delay:80ms]" />
                                <span className="w-1 h-3 bg-emerald-400 rounded animate-pulse [animation-delay:160ms]" />
                                <span className="text-[11px] text-emerald-300 ml-1">AI Speaking</span>
                            </div>
                        )}
                    </div>
                    <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-[0.2em]">
                        Advanced AI Chemistry Master • Delta G & pH Equations Support Ready
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIChemistryMaster;
