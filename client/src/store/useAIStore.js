import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeLocalStorage } from '../utils/safeStorage';

/**
 * useAIStore - AI Chemistry Master State
 * Manages chat history, modes, context, and learning progress.
 */
const useAIStore = create(
    persist(
        (set, get) => ({
            // Mode State
            isMiniOpen: false,
            currentMode: 'mini_assistant', // 'mini_assistant' | 'full_learning'

            // Conversation History
            miniChatHistory: [
                { role: 'assistant', content: 'Hello! I am your AI Chemistry Master. How can I help you today?' }
            ],
            fullChatHistory: [],

            // Context Awareness
            currentPage: 'Home',
            userLevel: 'High School', // Default
            currentTopic: 'General Chemistry',

            // Learning Progress
            progress: {
                lessonsCompleted: 0,
                quizzesTaken: 0,
                averageScore: 0,
                topicsMastered: []
            },

            // Actions
            toggleMiniAssistant: () => set(state => ({ isMiniOpen: !state.isMiniOpen })),
            setOpenMini: (isOpen) => set({ isMiniOpen: isOpen }),

            setMode: (mode) => set({ currentMode: mode === 'full_learning' ? 'full_learning' : 'mini_assistant' }),
            setCurrentPage: (page) => set({ currentPage: page }),
            setUserLevel: (level) => set({ userLevel: level }),
            setCurrentTopic: (topic) => set({ currentTopic: topic }),
            syncSettings: (settings) => set({
                currentMode: settings?.aiMode === 'full_learning' ? 'full_learning' : 'mini_assistant'
            }),

            addChatMessage: (message, mode = null) => set(state => {
                const targetMode = mode || state.currentMode;
                if (targetMode === 'mini_assistant') {
                    return { miniChatHistory: [...state.miniChatHistory, message] };
                } else {
                    return { fullChatHistory: [...state.fullChatHistory, message] };
                }
            }),

            clearHistory: (mode) => set(state => {
                if (mode === 'mini_assistant') return { miniChatHistory: [] };
                return { fullChatHistory: [] };
            }),

            updateLastChatMessage: (content, mode = null) => set(state => {
                const targetMode = mode || state.currentMode;
                if (targetMode === 'mini_assistant') {
                    const newHistory = [...state.miniChatHistory];
                    if (newHistory.length > 0) {
                        newHistory[newHistory.length - 1] = { ...newHistory[newHistory.length - 1], content };
                    }
                    return { miniChatHistory: newHistory };
                } else {
                    const newHistory = [...state.fullChatHistory];
                    if (newHistory.length > 0) {
                        newHistory[newHistory.length - 1] = { ...newHistory[newHistory.length - 1], content };
                    }
                    return { fullChatHistory: newHistory };
                }
            }),

            updateProgress: (newProgress) => set(state => ({
                progress: { ...state.progress, ...newProgress }
            })),

            resetAI: () => set({
                miniChatHistory: [{ role: 'assistant', content: 'Hello! I am your AI Chemistry Master. How can I help you today?' }],
                fullChatHistory: [],
                currentTopic: 'General Chemistry'
            })
        }),
        {
            name: 'clab-ai-master-storage',
            storage: safeLocalStorage
        }
    )
);

export default useAIStore;
