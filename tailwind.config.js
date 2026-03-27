/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        zinc: defaultTheme.colors ? undefined : undefined,
        indigo: defaultTheme.colors ? undefined : undefined,
        background: '#09090b',
        'surface-1': '#111113',
        'surface-2': '#18181b',
        border: '#27272a',
        accent: '#6366f1',
        'text-primary': '#fafafa',
        'text-muted': '#a1a1aa',
        'text-dim': '#52525b',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
