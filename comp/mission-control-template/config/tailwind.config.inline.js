
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Prompt', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        glass: {
                            100: 'var(--glass-bg-100)',
                            200: 'var(--glass-bg-200)',
                            300: 'var(--glass-bg-300)',
                        },
                        neon: {
                            green: 'var(--neon-green)',
                            blue: 'var(--neon-blue)',
                            purple: 'var(--neon-purple)'
                        },
                        cyber: {
                            bg: '#08090c',
                            card: 'rgba(18, 20, 28, 0.65)',
                            border: 'rgba(255, 255, 255, 0.08)',
                            text: '#f3f4f6',
                            muted: '#9ca3af',
                            emerald: '#10b981',
                            indigo: '#6366f1',
                            orange: '#f59e0b',
                            cyan: '#06b6d4',
                            purple: '#a855f7'
                        },
                        dark: 'var(--bg-body)'
                    }
                }
            }
        }
