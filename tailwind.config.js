/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./client/index.html",
        "./client/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    electricBlue: '#3B82F6',
                    softPurple: '#8B5CF6',
                    tealAccent: '#14B8A6',
                    warmOrange: '#F59E0B',
                    coralPink: '#F43F5E',
                    teal: '#00d4aa',
                    purple: '#7c6af7'
                },
                neon: {
                    green: '#39FF14',
                    cyan: '#00FFFF',
                    blue: '#0033FF',
                    purple: '#B026FF',
                    pink: '#FF007F',
                    red: '#FF3131',
                    orange: '#FF5E00',
                    yellow: '#FFFF00'
                },
                lab: {
                    dark: '#0a0f1a', // Next.js Phase 1 aesthetic
                    card: 'rgba(15, 23, 42, 0.4)', // slate-900 / 40%
                    border: 'rgba(56, 189, 248, 0.2)', // sky-400 / 20%
                    highlight: 'rgba(56, 189, 248, 0.1)'
                }
            },
            backgroundImage: {
                'lab-gradient': 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)',
                'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0))'
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'monospace'],
                heading: ['Space Grotesk', 'Outfit', 'sans-serif'],
            },
        }
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
