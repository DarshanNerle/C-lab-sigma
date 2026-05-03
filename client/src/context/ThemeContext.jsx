import React, { createContext, useContext, useEffect, useMemo } from 'react';
import useThemeStore from '../store/useThemeStore';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const { themeMode, setThemeMode } = useThemeStore();
    const [systemTheme, setSystemTheme] = React.useState('dark');

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = () => setSystemTheme(media.matches ? 'dark' : 'light');
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);

    const normalizedTheme = 'dark'; // Forced dark theme overrides user/system preference

    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('theme-transition');
        root.classList.toggle('dark', normalizedTheme === 'dark');
        root.classList.toggle('light', normalizedTheme === 'light');
        root.dataset.theme = normalizedTheme;

        const id = setTimeout(() => {
            root.classList.remove('theme-transition');
        }, 250);

        return () => clearTimeout(id);
    }, [normalizedTheme]);

    const value = useMemo(() => ({
        theme: normalizedTheme,
        themeMode,
        setTheme: (next) => setThemeMode(next === 'light' ? 'light' : next === 'system' ? 'system' : 'dark')
    }), [normalizedTheme, themeMode, setThemeMode]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within ThemeProvider');
    }
    return context;
}
