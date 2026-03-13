import { create } from 'zustand'

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    dbSource: 'unknown',
    isDbDegraded: false,
    storageMode: 'firebase',
    isLocalMode: false,

    setUser: (user, profileData = null, dbSource = 'unknown', storageMode = 'firebase') => set({
        user,
        profile: profileData,
        isAuthenticated: !!user,
        isStudent: profileData?.role === 'student',
        isTeacher: profileData?.role === 'teacher',
        isAdmin: profileData?.role === 'admin',
        dbSource,
        isDbDegraded: dbSource === 'memory',
        storageMode: storageMode === 'local' ? 'local' : 'firebase',
        isLocalMode: storageMode === 'local',
        isLoading: false
    }),
    setStorageMode: (storageMode = 'firebase') => set({
        storageMode: storageMode === 'local' ? 'local' : 'firebase',
        isLocalMode: storageMode === 'local'
    }),

    clearUser: () => set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isStudent: false,
        isTeacher: false,
        isAdmin: false,
        dbSource: 'unknown',
        isDbDegraded: false,
        storageMode: 'firebase',
        isLocalMode: false,
        isLoading: false
    })
}))

export default useAuthStore
