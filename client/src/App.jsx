import React, { useEffect, useRef } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import VirtualLab from './pages/VirtualLab'
import Experiments from './pages/Experiments'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import LeaderboardPage from './pages/LeaderboardPage'
import Register from './pages/Register'
import AdminDashboard from './pages/admin/AdminDashboard'
import TeacherDashboard from './pages/teaching/TeacherDashboard'
import VirtualLab2D from './pages/VirtualLab2D'
import SkillTree from './pages/SkillTree'
import LearnMore from './pages/LearnMore'
import ScientificCalculator from './pages/ScientificCalculator'
import LabReport from './components/reports/LabReport'
import AIChemistryMaster from './pages/AIChemistryMaster'
import LabNotebook from './components/notebook/LabNotebook'
import QuizOverlay from './components/quiz/QuizOverlay'
import FloatingAIButton from './components/teaching/FloatingAIButton'
import FloatingCalculatorButton from './components/tools/FloatingCalculatorButton'
import ExperimentLab from './pages/ExperimentLab'
import AppShell from './components/layout/AppShell'
import History from './pages/History'
import { soundManager } from './utils/soundManager'
import useThemeStore from './store/useThemeStore'
import useAuthStore from './store/useAuthStore'
import useGameStore from './store/useGameStore'
import useAIStore from './store/useAIStore'
import useVoiceStore from './store/useVoiceStore'
import useLabStore from './store/useLabStore'
import { auth } from './firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import DBStatusBadge from './components/ui/DBStatusBadge'
import { storageService } from './lib/storageService'

function App() {
    const navigate = useNavigate()
    const location = useLocation()
    const { isSoundEnabled, soundVolume, immersiveMode, animationIntensity, syncSettings } = useThemeStore()
    const { currentMode, syncSettings: syncAISettings } = useAIStore()
    const { voiceEnabled, speechRate, speechPitch, selectedVoice, voiceGender, syncSettings: syncVoiceSettings } = useVoiceStore()
    const { user, setUser, clearUser, setStorageMode } = useAuthStore()
    const { syncGameStats } = useGameStore()
    const { hydrateLabState } = useLabStore()
    const settingsSyncTimerRef = useRef(null)
    const isImmersiveLabRoute = location.pathname === '/experiment-lab' || location.pathname === '/experiments'

    useEffect(() => {
        const unsubscribeMode = storageService.subscribe((mode) => {
            setStorageMode(mode);
        });
        setStorageMode(storageService.getStorageMode());
        return () => unsubscribeMode();
    }, [setStorageMode]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const email = firebaseUser.email || ''
                    const data = await storageService.getUser(email)

                    if (data.user) {
                        const source = data.source || 'unknown'
                        syncSettings(data.user.settings || {})
                        syncAISettings(data.user.settings || {})
                        syncVoiceSettings(data.user.settings || {})
                        if (data.user.currentLabState) {
                            hydrateLabState(data.user.currentLabState)
                        }
                        if (syncGameStats) syncGameStats(data.user)
                        setUser(firebaseUser, data.user, source, data.storageMode || storageService.getStorageMode())
                    } else {
                        const createData = await storageService.saveUser({
                            email,
                            name: firebaseUser.displayName || ''
                        })
                        setUser(firebaseUser, createData.user || null, createData.source || 'unknown', createData.storageMode || storageService.getStorageMode())
                    }
                } catch (error) {
                    setUser(firebaseUser, null, 'unknown', storageService.getStorageMode())
                }
            } else {
                const currentEmail = useAuthStore.getState().user?.email || ''
                storageService.clearUser(currentEmail)
                clearUser()
            }
        })

        return () => unsubscribe()
    }, [clearUser, setUser, syncAISettings, syncGameStats, syncSettings, syncVoiceSettings, hydrateLabState])

    useEffect(() => {
        soundManager.init({
            soundEnabled: isSoundEnabled,
            soundVolume: soundVolume,
            immersiveMode: immersiveMode,
            debugMode: false
        })
        return () => {
            soundManager.dispose();
        }
    }, [])

    useEffect(() => {
        soundManager.updateSettings({
            soundEnabled: isSoundEnabled,
            soundVolume: soundVolume,
            immersiveMode: immersiveMode
        })
    }, [isSoundEnabled, soundVolume, immersiveMode])

    useEffect(() => {
        document.documentElement.classList.toggle('reduced-motion', animationIntensity === 'reduced')
    }, [animationIntensity])

    useEffect(() => {
        if (!user?.email) return

        if (settingsSyncTimerRef.current) {
            clearTimeout(settingsSyncTimerRef.current)
        }

        settingsSyncTimerRef.current = setTimeout(async () => {
            try {
                await storageService.updateSettings({
                    email: user.email,
                    settings: {
                        darkMode: useThemeStore.getState().themeMode !== 'light',
                        theme: useThemeStore.getState().themeMode,
                        autoTheme: useThemeStore.getState().themeMode === 'system',
                        soundEnabled: isSoundEnabled,
                        soundVolume,
                        immersiveMode,
                        aiMode: currentMode,
                        animationIntensity,
                        voiceEnabled,
                        speechRate,
                        speechPitch,
                        selectedVoice,
                        voiceGender
                    }
                })
            } catch (error) {
                // no-op in background sync
            }
        }, 500)

        return () => {
            if (settingsSyncTimerRef.current) {
                clearTimeout(settingsSyncTimerRef.current)
            }
        }
    }, [user?.email, isSoundEnabled, soundVolume, immersiveMode, currentMode, animationIntensity, voiceEnabled, speechRate, speechPitch, selectedVoice, voiceGender])

    useEffect(() => {
        const isTypingTarget = (target) => {
            const tag = target?.tagName?.toLowerCase()
            return tag === 'input' || tag === 'textarea' || target?.isContentEditable
        }

        const onKeyDown = (event) => {
            if (isTypingTarget(event.target)) return
            if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return

            const key = event.key.toLowerCase()
            if (key === 'd') navigate('/dashboard')
            if (key === 'a') navigate('/ai-chemistry-master')
            if (key === 'l') navigate(location.pathname === '/lab' ? '/lab2d' : '/lab')
        }

        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [location.pathname, navigate])

    return (
        <div className="w-full h-screen overflow-hidden flex flex-col relative">
            {!isImmersiveLabRoute && <LabNotebook />}
            {!isImmersiveLabRoute && <QuizOverlay />}
            {!isImmersiveLabRoute && <DBStatusBadge />}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/lab" element={<VirtualLab />} />
                <Route path="/lab3d" element={<VirtualLab />} />
                <Route path="/lab2d" element={<VirtualLab2D />} />
                <Route path="/experiments" element={<Experiments />} />
                <Route path="/experiment-lab" element={<ExperimentLab />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/teacher" element={<TeacherDashboard />} />
                <Route path="/report/:reportId" element={<LabReport />} />
                <Route path="/ai-chemistry-master" element={<AIChemistryMaster />} />
                <Route element={<AppShell />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/learn-more" element={<LearnMore />} />
                    <Route path="/calculator" element={<ScientificCalculator />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/edit" element={<EditProfile />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/skills" element={<SkillTree />} />
                </Route>
            </Routes>
            <FloatingCalculatorButton />
            {!isImmersiveLabRoute && <FloatingAIButton />}
        </div>
    )
}

export default App
