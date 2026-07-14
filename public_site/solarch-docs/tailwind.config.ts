import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a6fff',
        accent: '#00d4ff',
        'brand-blue': '#1a6fff',
        'brand-glow': '#3d8bff',
        'brand-bright': '#5ba3ff',
        'brand-cyan': '#00d4ff',
        'brand-cyan-muted': '#00a8cc',
        dark: 'var(--bg-void)',
        surface: 'var(--bg-surface)',
        muted: 'var(--bg-elevated)',
      },
      fontFamily: {
        heading: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 30px rgba(0,212,255,0.4)' },
          '50%': { boxShadow: '0 0 60px rgba(0,212,255,0.7), 0 0 100px rgba(26,111,255,0.3)' },
        },
        blink: {
          '50%': { opacity: '0' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        fadeUp: 'fadeUp 0.6s ease-out forwards',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [
    typography,
  ],
} satisfies Config
