import React, { useState, useEffect } from 'react';
import useLabStore from '../store/useLabStore';
import useNotebookStore from '../store/useNotebookStore';
import useQuizStore from '../store/useQuizStore';
import useGameStore from '../store/useGameStore';
import Beaker2D from '../components/lab2D/equipment/Beaker2D';
import Flask2D from '../components/lab2D/equipment/Flask2D';
import Burette2D from '../components/lab2D/equipment/Burette2D';
import Burner2D from '../components/lab2D/equipment/Burner2D';
import TestTube2D from '../components/lab2D/equipment/TestTube2D';
import KnowledgeLevelSelector from '../components/teaching/KnowledgeLevelSelector';
import PHCalculatorPanel from '../components/teaching/PHCalculatorPanel';
import GuidedExperimentHUD from '../components/teaching/GuidedExperimentHUD';
import PostExperimentQuiz from '../components/teaching/PostExperimentQuiz';
import { CHEMISTRY_DATABASE, REACTION_RULES } from '../constants/chemistryData';
import { chemicalsData, getChemData } from '../constants/chemicalsData';
import { TeachingController } from '../modules/teaching/TeachingController';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import ProfileDropdown from '../components/ui/ProfileDropdown';
import { logoutUser } from '../firebase/auth';
import LabAnalyticsPanel from '../components/lab2D/LabAnalyticsPanel';
import LabSessionController from '../components/lab2D/LabSessionController';
import LabEnhancementsHUD from '../components/ui/LabEnhancementsHUD';
import {
    FlaskConical, RefreshCw, Database, ArrowLeft, Book, X,
    Activity, Droplets, Brain, BookOpen, PlayCircle, Info, Undo2
} from 'lucide-react';

// ─── Feature Unlock Config ──────────────────────────────────────────────────
// pHCalculator unlocks after the user adds at least 2 chemicals (any container)
// guidedLesson always available
const checkFeatureUnlock = (containers) => {
    if (!containers || typeof containers !== 'object') {
        return { pHCalculator: false, guidedLesson: true, phMastery: false };
    }
    try {
        const totalComponents = Object.values(containers).reduce(
            (acc, c) => acc + (c?.components?.length || 0), 0
        );
        return {
            pHCalculator: totalComponents >= 1,   // Unlock after first chemical added
            guidedLesson: true,                    // Always available
            phMastery: totalComponents >= 2,       // Unlocks after 2 additions
        };
    } catch (e) {
        return { pHCalculator: false, guidedLesson: true, phMastery: false };
    }
};

export default function VirtualLab2D() {
    const {
        containers = {},
        equipment = { burner: { isOn: false, intensity: 1.0 }, stirrer: { isActive: false, rpm: 0 } },
        toggleEquipment,
        pour,
        resetLab,
        activeReaction,
        addChemical,
        currentLesson,
        currentStepId,
        knowledgeLevel,
        setLesson,
        undoLastStep,
        actionTimeline = []
    } = useLabStore();
    const navigate = useNavigate();


    const { addXP, discoverReaction, addBadge } = useGameStore();

    const [selectedContainer, setSelectedContainer] = useState('flask1');
    const [lastReaction, setLastReaction] = useState(null);
    const [sessionStartedAt] = useState(() => Date.now());
    const [pourAmount, setPourAmount] = useState(10);
    const [showTelemetry, setShowTelemetry] = useState(false);
    const [draggedSource, setDraggedSource] = useState(null);
    const [activeTab, setActiveTab] = useState('normal'); // 'normal' | 'titration'
    const [infoCardData, setInfoCardData] = useState(null); // Used for the floating instrument info card
    const [persistedInfoCard, setPersistedInfoCard] = useState(null); // Clicked persistent card
    const [titrationSession, setTitrationSession] = useState({
        isActive: false,
        initialVol: 0,
        finalVol: 0,
        titrantUsed: 0,
        isCompleted: false,
        endpointReached: false
    });

    // ── New feature states ──────────────────────────────────────────────────
    const [showPHPanel, setShowPHPanel] = useState(false);
    const [showLevelSelector, setShowLevelSelector] = useState(false);
    const [pendingLessonId, setPendingLessonId] = useState(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const [completedLessonId, setCompletedLessonId] = useState(null);
    const [showHint, setShowHint] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShowHint(false), 8000);
        return () => clearTimeout(timer);
    }, []);

    const featureUnlocks = checkFeatureUnlock(containers);
    const activePH = (containers && containers[selectedContainer]) ? (containers[selectedContainer].ph ?? 7.0) : 7.0;

    // ── Drag/Drop ───────────────────────────────────────────────────────────
    const handleDragStart = (e, sourceId) => {
        setDraggedSource(sourceId);
        e.dataTransfer.setData('sourceId', sourceId);
    };
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('sourceId') || draggedSource;
        if (!sourceId) return;

        // Check if source is a chemical ID or a container ID
        if (CHEMISTRY_DATABASE[sourceId]) {
            addChemical(targetId, sourceId, pourAmount);
        } else if (sourceId !== targetId && containers[sourceId]) {
            pour(sourceId, targetId, pourAmount);
        }
        setDraggedSource(null);
    };
    const handleBuretteDrop = (id, amount = 0.5) => {
        const target = selectedContainer.startsWith('flask') || selectedContainer.startsWith('beaker')
            ? selectedContainer : 'flask1';
        if (target !== id) {
            pour(id, target, amount); // Respect the drop volume
        }
    };
    const toggleBuretteValve = (id) => {
        const current = containers?.[id];
        if (!current) return;

        const nextState = !current.isOpen;

        // Start titration session if turning on
        if (activeTab === 'titration' && nextState && !titrationSession.isActive) {
            setTitrationSession(prev => ({
                ...prev,
                isActive: true,
                initialVol: current.volume,
                endpointReached: false,
                isCompleted: false
            }));
        }

        useLabStore.setState(state => ({
            containers: { ...state.containers, [id]: { ...current, isOpen: nextState } }
        }));
    };
    const refillContainer = (id) => {
        const container = containers[id];
        if (!container) return;
        const firstChem = container.components[0]?.id || 'water';
        useLabStore.setState(state => ({
            containers: {
                ...state.containers,
                [id]: {
                    ...container,
                    volume: container.maxCapacity,
                    components: [{ id: firstChem, volume: container.maxCapacity }],
                    color: CHEMISTRY_DATABASE[firstChem]?.color || 'rgba(255,255,255,0.1)',
                    ph: CHEMISTRY_DATABASE[firstChem]?.ph || 7.0
                }
            }
        }));
    };

    useEffect(() => {
        if (activeReaction && activeReaction.xp) {
            addXP(activeReaction.xp);
            if (activeReaction.id) discoverReaction(activeReaction.id);
            setLastReaction(activeReaction);
            if (activeReaction.xp >= 100) addBadge('Perfect Score');
            if (Date.now() - sessionStartedAt < 90000) addBadge('Fast Completion');
        }
    }, [activeReaction, addXP, discoverReaction, addBadge, sessionStartedAt]);

    // Titration Endpoint Detection
    useEffect(() => {
        if (activeTab === 'titration' && titrationSession.isActive && !titrationSession.endpointReached) {
            const flask = containers['flask1'];
            // Detect phenolphthalein pink or other indicator shifts
            // Engine sets hot pink for ph > 8.5
            if (flask?.color.includes('255, 0, 128') || flask?.ph > 8.5) {
                // Endpoint reached!
                const burette = containers['burette1'];

                // Stop flow
                useLabStore.setState(state => ({
                    containers: { ...state.containers, burette1: { ...state.containers.burette1, isOpen: false } }
                }));

                setTitrationSession(prev => {
                    const titrantConsumed = prev.initialVol - burette.volume;
                    return {
                        ...prev,
                        endpointReached: true,
                        finalVol: burette.volume,
                        titrantUsed: titrantConsumed,
                        isCompleted: true
                    };
                });
            }
        }
    }, [containers, activeTab, titrationSession.isActive, titrationSession.endpointReached]);

    // Update persisted card data if it exists and container changes
    useEffect(() => {
        if (persistedInfoCard && persistedInfoCard.containerId !== 'Burner') {
            const containerKey = Object.keys(containers).find(key => {
                const type = containers[key].type;
                const label = type === 'testTube' ? 'Test Tube' : type === 'beaker' ? 'Beaker' : type === 'flask' ? 'Conical Flask' : type === 'burette' ? 'Burette' : null;
                return label === persistedInfoCard.containerId;
            });

            // Simpler matching: find by id from the info card if we store it
            const matchingContainer = containers[selectedContainer]; // Usually the selected one is being watched
            if (matchingContainer) {
                const comp = matchingContainer.components[0];
                setPersistedInfoCard({
                    containerId: persistedInfoCard.containerId,
                    chemicalName: comp?.id ? CHEMISTRY_DATABASE[comp.id]?.name : 'Empty Vessel',
                    chemicalFormula: comp?.id ? CHEMISTRY_DATABASE[comp.id]?.formula : '--',
                    volume: matchingContainer.volume.toFixed(1),
                    color: matchingContainer.color,
                    state: 'LIQUID'
                });
            }
        }
    }, [containers, selectedContainer]);

    // ── Lesson triggering ────────────────────────────────────────────────────
    const handleStartLesson = (lessonId) => {
        setPendingLessonId(lessonId);
        setShowLevelSelector(true);
    };

    const handleLevelConfirm = (level) => {
        const lesson = TeachingController.LESSONS.find(l => l.id === pendingLessonId);
        if (lesson) setLesson(lesson);
        setShowLevelSelector(false);
        setPendingLessonId(null);
    };

    const handleExperimentComplete = () => {
        setCompletedLessonId(currentLesson?.id || 'ph_mastery');
        setShowQuiz(true);
    };

    const [chemicals] = useState(Object.values(CHEMISTRY_DATABASE).slice(0, 24));

    // ── pH color helper ──────────────────────────────────────────────────────
    const phColor = (ph) => {
        if (ph < 3) return '#ef4444';
        if (ph < 7) return '#f97316';
        if (ph <= 7.1) return '#22d3ee';
        if (ph < 11) return '#a855f7';
        return '#3b82f6';
    };

    return (
        <div className="w-full h-screen flex flex-col bg-lab-dark relative overflow-hidden font-sans mesh-gradient-blue text-white">

            {/* Background Atmosphere */}
            <div className="absolute top-0 left-0 w-full h-full opacity-30 select-none pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            {draggedSource && (
                <div className="absolute inset-0 z-[100] pointer-events-none border-4 border-dashed border-neon-cyan/20 animate-pulse" />
            )}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />

            {/* ── Header ─────────────────────────────────────────────────────── */}
                        <LabEnhancementsHUD
                contextKey="lab2d"
                reaction={lastReaction || activeReaction}
                onReplay={() => {
                    if (lastReaction) useLabStore.setState({ activeReaction: lastReaction });
                }}
            />

            <header className="relative z-50 p-4 md:p-6 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5 shadow-2xl">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="p-2 md:p-3 advanced-glass rounded-2xl text-slate-500 border-white/5 cursor-default">
                            <Activity className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-200">LABORATORY MATRIX</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                                <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Active Session // {selectedContainer.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
                        <button
                            onClick={() => { setActiveTab('normal'); setSelectedContainer('beaker1'); resetLab(); }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'normal' ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-slate-400 hover:text-white'}`}
                        >
                            Reaction Lab
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('titration');
                                setSelectedContainer('burette1');
                                resetLab();
                                // Setup Titration Baseline
                                addChemical('flask1', 'hydrochloric_acid', 50);
                                addChemical('flask1', 'phenolphthalein', 2);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'titration' ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-slate-400 hover:text-white'}`}
                        >
                            Titration Lab
                        </button>
                    </div>

                    {/* ── LAB SESSION CONTROLLER (Like Google Cloud / Qwiklabs) ── */}
                    <div className="hidden lg:flex items-center px-6 border-l border-white/10">
                        <LabSessionController
                            onStart={() => resetLab()}
                            onEnd={(results) => {
                                console.log('Lab session ended:', results);
                                addXP(150); // Award XP for completing the session
                                if (currentLesson) handleExperimentComplete();
                                else resetLab();
                            }}
                            labName={currentLesson?.title || "Reaction Matrix Lab"}
                            durationMinutes={45}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* pH live badge */}
                    <AnimatePresence>
                        {featureUnlocks.pHCalculator && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => setShowPHPanel(v => !v)}
                                className="hidden sm:flex items-center gap-2 px-3 py-2 advanced-glass rounded-xl border-white/10 transition-all hover:bg-white/5"
                            >
                                <Droplets className="w-4 h-4 text-indigo-400" />
                                <span className="font-mono font-bold text-sm text-slate-300">
                                    pH {activePH.toFixed(2)}
                                </span>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Knowledge level badge */}
                    {currentLesson && (
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                            <Brain className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">{knowledgeLevel}</span>
                        </div>
                    )}

                    <button
                        onClick={() => setShowTelemetry(!showTelemetry)}
                        className="lg:hidden p-3 advanced-glass rounded-xl text-neon-cyan active:scale-90 transition-transform"
                    >
                        <Activity className="w-5 h-5" />
                    </button>

                    <div className="hidden lg:flex flex-col items-end px-6 border-r border-white/10 uppercase">
                        <span className="text-[9px] font-black text-neon-purple tracking-widest">Atmospheric Pressure</span>
                        <span className="text-lg font-mono font-bold text-white tracking-tighter">1.01 atm</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => useNotebookStore.getState().toggleNotebook()}
                            className="hidden md:flex advanced-glass px-4 md:px-6 py-3 rounded-xl text-slate-300 hover:text-white transition-all items-center gap-3 font-bold text-[10px] tracking-widest border-white/5"
                        >
                            <Book className="w-4 h-4" /> NOTEBOOK
                        </button>
                        <button
                            onClick={resetLab}
                            className="p-3 advanced-glass rounded-xl text-gray-400 hover:text-red-400 transition-all active:rotate-180 duration-500"
                            title="Reset Laboratory"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={undoLastStep}
                            className="p-3 advanced-glass rounded-xl text-gray-400 hover:text-cyan-300 transition-all"
                            title="Undo Last Step"
                        >
                            <Undo2 className="w-5 h-5" />
                        </button>

                        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>

                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            {/* ── Main Layout ─────────────────────────────────────────────────── */}
            <main className="flex-1 flex min-h-0 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(59,130,246,0.12),transparent_55%)] animate-pulse" />

                {/* ── Left Sidebar ──────────────────────────────────────────────── */}
                <aside className={`
                    fixed inset-y-0 left-0 z-[150] w-80 bg-black/95 backdrop-blur-2xl p-6 transform transition-transform duration-500 border-r border-white/10
                    lg:relative lg:translate-x-0 lg:bg-black/20 lg:backdrop-blur-sm lg:z-10 shadow-2xl flex flex-col gap-4
                    ${showTelemetry ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <button onClick={() => setShowTelemetry(false)} className="lg:hidden absolute top-6 right-6 text-gray-500 hover:text-white p-2">
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    <div className="flex flex-col h-full gap-4 overflow-y-auto scrollbar-hide">
                        {/* Active Selector */}
                        <div className="flex flex-col gap-2 mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Selector</span>
                            <div className="text-xl font-bold tracking-tight text-white uppercase">{selectedContainer}</div>
                        </div>

                        {/* Components */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Components</span>
                                <div className="text-[10px] font-mono font-bold text-neon-cyan">
                                    {(containers[selectedContainer]?.volume || 0).toFixed(1)} / {containers[selectedContainer]?.maxCapacity} mL
                                </div>
                            </div>
                            {(!containers[selectedContainer] || containers[selectedContainer].components.length === 0) ? (
                                <div className="p-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] text-center">
                                    <Database className="w-8 h-8 text-white/10 mx-auto mb-3" />
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed">Vessel is Vacant<br />Inject chemicals below</p>
                                </div>
                            ) : (
                                containers[selectedContainer].components.map(c => (
                                    <div key={c.id} className="advanced-glass p-4 rounded-2xl border-white/5 hover:border-neon-cyan/30 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-xs font-black text-white uppercase">{CHEMISTRY_DATABASE[c.id]?.name}</div>
                                                <div className="text-[10px] font-mono text-neon-cyan font-bold">{CHEMISTRY_DATABASE[c.id]?.formula}</div>
                                            </div>
                                        </div>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-neon-cyan" style={{ width: `${(c.volume / containers[selectedContainer].maxCapacity) * 100}%` }} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Refill */}
                        <button
                            onClick={() => refillContainer(selectedContainer)}
                            className="w-full py-3 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-black text-[10px] tracking-[0.3em] uppercase hover:bg-neon-cyan hover:text-white transition-all"
                        >
                            <RefreshCw className="w-3 h-3 inline mr-2" /> REFILL
                        </button>

                        {/* Physical Matrix */}
                        <div className="advanced-glass p-5 rounded-3xl border-neon-purple/20">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-4 h-4 text-neon-purple" />
                                <span className="text-[10px] font-black text-white tracking-[0.2em]">PHYSICAL MATRIX</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[8px] text-gray-500 font-bold uppercase mb-1">Temperature</div>
                                    <div className="text-xl font-mono font-black text-white">{(containers[selectedContainer]?.temp || 25).toFixed(1)}°C</div>
                                </div>
                                <div>
                                    <div className="text-[8px] text-gray-500 font-bold uppercase mb-1">Volume</div>
                                    <div className="text-xl font-mono font-black text-white">{(containers[selectedContainer]?.volume || 0).toFixed(1)} mL</div>
                                </div>
                            </div>
                        </div>

                        {/* ── pH Calculator Panel ─────────────────────────────────── */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-neon-cyan uppercase tracking-widest flex items-center gap-1.5">
                                    <Droplets className="w-3 h-3" /> pH Calculator
                                </span>
                                {featureUnlocks.pHCalculator ? (
                                    <button
                                        onClick={() => setShowPHPanel(v => !v)}
                                        className="text-[9px] font-black text-neon-cyan/60 hover:text-neon-cyan uppercase tracking-widest transition-colors"
                                    >
                                        {showPHPanel ? 'Hide' : 'Show'}
                                    </button>
                                ) : (
                                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Add a chemical to unlock</span>
                                )}
                            </div>
                            <PHCalculatorPanel ph={activePH} isVisible={showPHPanel && featureUnlocks.pHCalculator} />
                        </div>

                        {/* ── Guided Experiment HUD ──────────────────────────────── */}
                        <div className="border-t border-white/5 pt-4">
                            {currentLesson ? (
                                <GuidedExperimentHUD onExperimentComplete={handleExperimentComplete} />
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                                        <BookOpen className="w-3 h-3" /> Guided Experiments
                                    </span>
                                    {TeachingController.LESSONS.map(lesson => (
                                        <button
                                            key={lesson.id}
                                            onClick={() => handleStartLesson(lesson.id)}
                                            className="w-full p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 text-left transition-all group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs font-black text-white group-hover:text-purple-300 transition-colors">{lesson.title}</div>
                                                    <div className="text-[9px] text-gray-500 mt-0.5">{lesson.steps.length} steps</div>
                                                </div>
                                                <PlayCircle className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Lab Analytics Panel ─────────────────── */}
                        <div className="border-t border-white/5 pt-4">
                            <LabAnalyticsPanel activeTab={activeTab} titrationSession={titrationSession} />
                        </div>
                        <div className="border-t border-white/5 pt-4">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reaction Timeline</div>
                            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                                {actionTimeline.slice(-8).reverse().map((entry, idx) => (
                                    <div key={`${entry.ts}-${idx}`} className="text-[9px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-slate-300">
                                        {new Date(entry.ts).toLocaleTimeString()} - {entry.type}
                                        {entry.reaction ? ` (${entry.reaction})` : ''}
                                    </div>
                                ))}
                                {actionTimeline.length === 0 && (
                                    <div className="text-[9px] text-slate-500">No actions yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Main Stage ─────────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 p-4 md:p-12 relative flex flex-col z-20 overflow-hidden"
                >
                    <div className="flex-1 bg-black/40 rounded-[30px] md:rounded-[40px] border border-white/5 flex items-end justify-center pb-12 md:pb-24 gap-4 md:gap-8 px-4 md:px-12 relative overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
                        {/* Lab surface */}
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-white/5 border-t border-white/5 backdrop-blur-xl" />

                        <AnimatePresence>
                            {!currentLesson && showHint && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                    className="absolute top-8 left-8 px-6 py-2 bg-slate-900/80 border border-white/10 rounded-full backdrop-blur-xl z-50 whitespace-nowrap hidden sm:block shadow-2xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <Info className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Drag to Transform Matter // Click to Select Target</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Toggle Hint Button */}
                        {!currentLesson && !showHint && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={() => setShowHint(true)}
                                className="absolute top-8 left-8 p-2 bg-black/20 hover:bg-black/40 border border-white/5 rounded-full backdrop-blur-md z-40 transition-colors group"
                                title="Show Instructions"
                            >
                                <Info className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                            </motion.button>
                        )}

                        {/* Dedicated right-side Instruction Space (Notebook style) */}
                        <AnimatePresence mode="wait">
                            {currentLesson && (
                                <motion.div
                                    key={currentStepId}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 50 }}
                                    className="absolute top-8 right-8 z-50 w-72 pointer-events-none"
                                >
                                    <div className="advanced-glass p-6 rounded-[32px] border-purple-500/20 bg-black/40 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col gap-4 relative overflow-hidden">
                                        {/* Notebook/Log header */}
                                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-flicker" />
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">LAB_LOG // 0{currentStepId + 1}</span>
                                            </div>
                                            <span className="text-[9px] font-mono text-purple-400/60">EST: 2026</span>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-[10px] font-black text-purple-300 uppercase tracking-widest leading-none">Experiment Objective</h3>
                                            <p className="text-sm font-bold text-white italic leading-tight">
                                                {currentLesson.steps[currentStepId]?.task}
                                            </p>
                                        </div>

                                        {/* Progress indicators */}
                                        <div className="flex gap-1 mt-2">
                                            {currentLesson.steps.map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= currentStepId ? 'bg-purple-500' : 'bg-white/10'}`}
                                                />
                                            ))}
                                        </div>

                                        <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest text-right">
                                            Step {currentStepId + 1} of {currentLesson.steps.length}
                                        </div>

                                        {/* Decorative holographic lines */}
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl pointer-events-none" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Floating live pH badge (bottom-right of canvas) */}
                        <AnimatePresence>
                            {featureUnlocks.pHCalculator && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                    onClick={() => { setShowPHPanel(v => !v); setShowTelemetry(true); }}
                                    className="absolute bottom-16 right-6 z-40 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl backdrop-blur-xl border"
                                    style={{
                                        background: `${phColor(activePH)}15`,
                                        borderColor: `${phColor(activePH)}44`,
                                        boxShadow: `0 0 24px ${phColor(activePH)}33`,
                                    }}
                                    title="Click to open pH Calculator"
                                >
                                    <div className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: phColor(activePH) + 'aa' }}>pH</div>
                                    <div className="text-2xl font-black font-mono leading-none" style={{ color: phColor(activePH) }}>
                                        {activePH.toFixed(2)}
                                    </div>
                                    {/* tiny pH zone label */}
                                    <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: phColor(activePH) + '99' }}>
                                        {activePH < 7 ? 'ACIDIC' : activePH > 7 ? 'BASIC' : 'NEUTRAL'}
                                    </div>
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* Floating Info Card */}
                        <AnimatePresence>
                            {(infoCardData || persistedInfoCard) && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute top-24 left-1/2 -translate-x-1/2 z-[200] p-4 bg-slate-900/95 border border-white/10 shadow-2xl rounded-2xl backdrop-blur-3xl w-72 pointer-events-auto"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-[10px] font-black tracking-widest uppercase text-slate-400">{(infoCardData || persistedInfoCard).containerId}</div>
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: (infoCardData || persistedInfoCard).color || 'transparent' }}></div>
                                            {persistedInfoCard && (
                                                <button onClick={() => setPersistedInfoCard(null)} className="text-white/40 hover:text-white">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-base font-black text-white mb-1 uppercase tracking-tight">{(infoCardData || persistedInfoCard).chemicalName || 'Empty Vessel'}</div>
                                    <div className="text-xs text-neon-cyan font-mono font-bold">{(infoCardData || persistedInfoCard).chemicalFormula || '--'}</div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] text-gray-400 uppercase tracking-[0.2em]">
                                        <div className="bg-white/5 p-2 rounded-xl">
                                            <span className="block text-[8px] text-gray-500 mb-1">Quantity</span>
                                            <span className="font-mono text-white text-xs">{(infoCardData || persistedInfoCard).volume || 0} mL</span>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-xl">
                                            <span className="block text-[8px] text-gray-500 mb-1">State</span>
                                            <span className="font-mono text-white text-xs">{(infoCardData || persistedInfoCard).state || 'LIQUID'}</span>
                                        </div>
                                    </div>
                                    {persistedInfoCard && (
                                        <div className="mt-4 pt-4 border-t border-white/5 text-[9px] text-slate-500 leading-relaxed italic">
                                            Scientific Detail: Observed {(infoCardData || persistedInfoCard).chemicalName} at equilibrium. No active catalysis detected.
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Equipment Mapping based on Tab */}
                        <div className="flex items-end gap-6 md:gap-12 relative z-30 transition-all duration-700 hover:scale-[1.01] justify-center h-full max-h-[550px] overflow-x-auto overflow-y-hidden w-full scrollbar-hide">
                            {activeTab === 'normal' && (
                                <>
                                    {/* Burner */}
                                    <div className="relative group shrink-0"
                                        onMouseEnter={() => setInfoCardData({ containerId: 'Burner', chemicalName: 'Bunsen Burner', chemicalFormula: 'Fire' })}
                                        onMouseLeave={() => setInfoCardData(null)}
                                        onClick={() => setPersistedInfoCard({ containerId: 'Burner', chemicalName: 'Bunsen Burner', chemicalFormula: 'Fire' })}
                                    >
                                        <Burner2D isOn={equipment.burner.isOn} intensity={equipment.burner.intensity} onClick={() => toggleEquipment('burner')} />
                                    </div>

                                    {/* Beaker */}
                                    <div className="relative group shrink-0"
                                        onMouseEnter={() => setInfoCardData({ containerId: 'Beaker', chemicalName: containers['beaker1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['beaker1'].components[0].id]?.name : 'Empty', chemicalFormula: containers['beaker1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['beaker1'].components[0].id]?.formula : '', volume: containers['beaker1']?.volume, color: containers['beaker1']?.color })}
                                        onMouseLeave={() => setInfoCardData(null)}
                                        onClick={() => {
                                            setSelectedContainer('beaker1');
                                            setPersistedInfoCard({ containerId: 'Beaker', chemicalName: containers['beaker1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['beaker1'].components[0].id]?.name : 'Empty', chemicalFormula: containers['beaker1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['beaker1'].components[0].id]?.formula : '', volume: containers['beaker1']?.volume, color: containers['beaker1']?.color });
                                        }}
                                    >
                                        <Beaker2D
                                            id="beaker1" selected={selectedContainer === 'beaker1'}
                                            onClick={() => { }} // Handle via parent div for info card consistency
                                            onDragStart={(e) => handleDragStart(e, 'beaker1')}
                                            onDrop={(e) => handleDrop(e, 'beaker1')}
                                            onDragOver={handleDragOver}
                                            label="STORAGE"
                                        />
                                        {selectedContainer === 'beaker1' && (
                                            <motion.div layoutId="vessel-glow" className="absolute -inset-4 bg-neon-cyan/10 rounded-[40px] border border-neon-cyan/40 blur-xl pointer-events-none shadow-[0_0_30px_rgba(34,211,238,0.4)]" />
                                        )}
                                    </div>

                                    {/* Test Tube 1 */}
                                    <div className="relative group shrink-0"
                                        onMouseEnter={() => setInfoCardData({ containerId: 'Test Tube', chemicalName: containers['testTube1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['testTube1'].components[0].id]?.name : 'Empty', chemicalFormula: containers['testTube1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['testTube1'].components[0].id]?.formula : '', volume: containers['testTube1']?.volume, color: containers['testTube1']?.color })}
                                        onMouseLeave={() => setInfoCardData(null)}
                                        onClick={() => {
                                            setSelectedContainer('testTube1');
                                            setPersistedInfoCard({ containerId: 'Test Tube', chemicalName: containers['testTube1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['testTube1'].components[0].id]?.name : 'Empty', chemicalFormula: containers['testTube1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['testTube1'].components[0].id]?.formula : '', volume: containers['testTube1']?.volume, color: containers['testTube1']?.color });
                                        }}
                                    >
                                        <TestTube2D
                                            id="testTube1" selected={selectedContainer === 'testTube1'}
                                            onClick={() => { }}
                                            onDragStart={(e) => handleDragStart(e, 'testTube1')}
                                            onDrop={(e) => handleDrop(e, 'testTube1')}
                                            onDragOver={handleDragOver}
                                        />
                                        {selectedContainer === 'testTube1' && (
                                            <motion.div layoutId="vessel-glow" className="absolute -inset-6 bg-neon-cyan/10 rounded-[40px] border border-neon-cyan/40 blur-xl pointer-events-none shadow-[0_0_30px_rgba(34,211,238,0.4)]" />
                                        )}
                                    </div>
                                </>
                            )}

                            {activeTab === 'titration' && (
                                <>
                                    {/* Burette 1 */}
                                    <div className="relative flex flex-col items-center group shrink-0"
                                        onMouseEnter={() => setInfoCardData({ containerId: 'Burette', chemicalName: containers['burette1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['burette1'].components[0].id]?.name : 'Empty', chemicalFormula: containers['burette1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['burette1'].components[0].id]?.formula : '', volume: containers['burette1']?.volume, color: containers['burette1']?.color })}
                                        onMouseLeave={() => setInfoCardData(null)}
                                        onClick={() => {
                                            setSelectedContainer('burette1');
                                            setPersistedInfoCard({ containerId: 'Burette', chemicalName: containers['burette1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['burette1'].components[0].id]?.name : 'Empty', chemicalFormula: containers['burette1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['burette1'].components[0].id]?.formula : '', volume: containers['burette1']?.volume, color: containers['burette1']?.color });
                                        }}
                                    >
                                        <div className="absolute -top-12 z-50 whitespace-nowrap">
                                            <span className={`px-2 py-1 ${selectedContainer === 'burette1' ? 'bg-neon-cyan/20 border-neon-cyan' : 'bg-neon-purple/20 border-neon-purple/40'} border rounded text-[8px] font-bold text-white uppercase tracking-widest transition-colors`}>
                                                TITRANT SOURCE
                                            </span>
                                        </div>
                                        <div
                                            className={`relative p-2 rounded-2xl transition-all duration-300 ${selectedContainer === 'burette1' ? 'bg-white/5 ring-1 ring-neon-cyan/50' : 'hover:bg-white/[0.02]'}`}
                                        >
                                            <Burette2D id="burette1" onValveChange={() => toggleBuretteValve('burette1')} onDrop={(amt) => handleBuretteDrop('burette1', amt)} />
                                            <div className="absolute inset-0 cursor-move" draggable onDragStart={(e) => handleDragStart(e, 'burette1')} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'burette1')} />
                                        </div>
                                    </div>

                                    {/* Flask 1 (Analyte) */}
                                    <div className="relative flex flex-col items-center group shrink-0"
                                        onMouseEnter={() => setInfoCardData({ containerId: 'Conical Flask', chemicalName: containers['flask1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['flask1'].components[0].id]?.name : 'Empty', chemicalFormula: containers['flask1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['flask1'].components[0].id]?.formula : '', volume: containers['flask1']?.volume, color: containers['flask1']?.color })}
                                        onMouseLeave={() => setInfoCardData(null)}
                                        onClick={() => {
                                            setSelectedContainer('flask1');
                                            setPersistedInfoCard({ containerId: 'Conical Flask', chemicalName: containers['flask1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['flask1'].components[0].id]?.name : 'Empty', chemicalFormula: containers['flask1']?.components[0]?.id ? CHEMISTRY_DATABASE[containers['flask1'].components[0].id]?.formula : '', volume: containers['flask1']?.volume, color: containers['flask1']?.color });
                                        }}
                                    >
                                        <Flask2D
                                            id="flask1" selected={selectedContainer === 'flask1'}
                                            onClick={() => { }}
                                            onDragStart={(e) => handleDragStart(e, 'flask1')}
                                            onDrop={(e) => handleDrop(e, 'flask1')}
                                            onDragOver={handleDragOver}
                                            label="ANALYTE FLASK"
                                        />
                                        {selectedContainer === 'flask1' && (
                                            <motion.div layoutId="vessel-glow" className="absolute -inset-8 bg-neon-cyan/10 rounded-[40px] border border-neon-cyan/40 blur-xl pointer-events-none shadow-[0_0_30px_rgba(34,211,238,0.4)]" />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Reaction Overlay */}
                <AnimatePresence>
                    {activeReaction && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="absolute inset-x-4 top-12 md:left-1/2 md:-translate-x-1/2 z-[100] md:w-full md:max-w-4xl"
                        >
                            <div className="advanced-glass p-6 md:p-10 rounded-[30px] md:rounded-[40px] border-neon-cyan/30 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
                                <div className="relative flex flex-col md:flex-row gap-6 md:gap-10 items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="px-3 py-1 bg-neon-cyan/20 rounded-full border border-neon-cyan/30 text-[8px] font-black text-neon-cyan uppercase tracking-[0.3em] animate-pulse">
                                                Molecular Sync Complete
                                            </div>
                                        </div>
                                        <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white mb-2 uppercase leading-none">{activeReaction.name}</h2>
                                        <div className="text-neon-cyan font-mono text-xs md:text-sm font-bold tracking-widest mb-4 border-l-2 border-neon-cyan pl-4 bg-neon-cyan/5 py-1">{activeReaction.equation}</div>
                                        <p className="text-[10px] md:text-[11px] text-gray-400 mb-6 leading-relaxed italic">{activeReaction.scientificMechanism}</p>
                                    </div>
                                    <div className="w-full md:w-64 flex flex-col gap-4">
                                        <div className="advanced-glass p-4 md:p-6 rounded-3xl border-neon-purple/20 bg-neon-purple/5 text-center">
                                            <div className="text-[10px] font-black text-white">+{activeReaction.xp} XP</div>
                                        </div>
                                        <button onClick={() => useLabStore.setState({ activeReaction: null })} className="w-full py-4 rounded-2xl bg-white text-black font-black text-[10px] tracking-[0.3em] uppercase hover:bg-neon-cyan hover:text-white transition-all">CLOSE</button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeReaction && (
                        <div className="pointer-events-none absolute inset-x-0 top-20 z-[90] flex justify-center gap-2">
                            {Array.from({ length: 10 }).map((_, index) => (
                                <span
                                    key={index}
                                    className="h-1.5 w-1.5 rounded-full bg-cyan-300/80 shadow-[0_0_8px_rgba(56,189,248,0.9)] animate-[ping_1200ms_ease-out_infinite]"
                                    style={{ animationDelay: `${index * 90}ms` }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Titration Summary Overlay */}
                    {titrationSession.isCompleted && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-x-4 top-12 md:left-1/2 md:-translate-x-1/2 z-[110] md:w-full md:max-w-2xl"
                        >
                            <div className="advanced-glass p-8 rounded-[40px] border-neon-purple/30 shadow-[0_40px_100px_rgba(0,0,0,0.8)] text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent" />
                                <FlaskConical className="w-12 h-12 text-neon-purple mx-auto mb-4 animate-bounce" />
                                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Endpoint Detected!</h2>
                                <p className="text-slate-400 text-xs uppercase tracking-[.2em] mb-8 font-bold">Titration Analysis Complete</p>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">Initial Volume</div>
                                        <div className="text-xl font-mono text-white font-black">{titrationSession.initialVol.toFixed(2)} mL</div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="text-[8px] text-slate-500 font-bold uppercase mb-1">Final Volume</div>
                                        <div className="text-xl font-mono text-white font-black">{titrationSession.finalVol.toFixed(2)} mL</div>
                                    </div>
                                    <div className="col-span-2 p-6 bg-neon-purple/10 rounded-3xl border border-neon-purple/20">
                                        <div className="text-[10px] text-neon-purple font-black uppercase mb-2 tracking-widest">Titrant Used (ΔV)</div>
                                        <div className="text-4xl font-mono text-white font-black">{titrationSession.titrantUsed.toFixed(2)} mL</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] text-slate-500 italic leading-relaxed">
                                        The equivalence point was identified by the permanent color change of the indicator. You can use this volume to calculate the concentration of the unknown analyte.
                                    </p>
                                    <button
                                        onClick={() => setTitrationSession({ isActive: false, initialVol: 0, finalVol: 0, titrantUsed: 0, isCompleted: false, endpointReached: false })}
                                        className="w-full py-4 rounded-2xl bg-white text-black font-black text-[10px] tracking-[0.3em] uppercase hover:bg-neon-purple hover:text-white transition-all shadow-xl"
                                    >
                                        Start New Trial
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* ── Chemical Fabricator Footer ─────────────────────────────────── */}
            <footer className="lab-table-surface h-44 md:h-48 w-full backdrop-blur-2xl z-40 p-4 md:p-6 flex flex-col gap-4 shrink-0">
                <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-4 md:gap-10">
                        <div className="hidden sm:flex items-center gap-4 text-white/40">
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <FlaskConical className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">MATTER FABRICATOR</span>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                            <input
                                type="range" min="1" max="50" step="1"
                                value={pourAmount}
                                onChange={(e) => setPourAmount(parseInt(e.target.value))}
                                className="w-24 md:w-48 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                            />
                            <span className="text-xs font-mono font-black text-neon-cyan min-w-[40px]">{pourAmount}mL</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest block">TARGET_VESSEL</span>
                        <span className="text-[10px] md:text-xs font-black text-white italic tracking-widest border-b border-neon-cyan/50 pb-1">{selectedContainer.toUpperCase()}</span>
                    </div>
                </div>

                <div className="flex gap-4 md:gap-6 overflow-x-auto pb-2 scrollbar-hide max-w-7xl mx-auto w-full px-2">
                    {chemicals.map(chem => (
                        <button
                            key={chem.id}
                            onClick={() => addChemical(selectedContainer, chem.id, pourAmount)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, chem.id)}
                            className="flex-shrink-0 w-28 md:w-36 advanced-glass hover:bg-white/10 hover:border-neon-cyan/30 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border-white/5 group cursor-grab active:cursor-grabbing relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform group-hover:scale-110" style={{ backgroundColor: chem.color || (chemicalsData && chemicalsData.find(c => c.id === chem.id)?.originalColor) || 'rgba(255,255,255,0.2)' }} />
                            <div className="text-center mt-1 z-10">
                                <div className="text-[10px] md:text-xs font-black text-white uppercase tracking-tighter drop-shadow-md">{chem.formula}</div>
                                <div className="text-[7px] md:text-[8px] text-gray-400 font-bold tracking-widest uppercase truncate w-20 md:w-24 mt-1">{chem.name}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </footer>

            {/* ── Overlays ────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showLevelSelector && (
                    <KnowledgeLevelSelector
                        onClose={() => setShowLevelSelector(false)}
                        onConfirm={handleLevelConfirm}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showQuiz && (
                    <PostExperimentQuiz
                        lessonId={completedLessonId}
                        knowledgeLevel={knowledgeLevel}
                        onClose={() => { setShowQuiz(false); setCompletedLessonId(null); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}


