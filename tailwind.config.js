/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#0a0a0a',
        foreground: '#fafafa',
        card: {
          DEFAULT: '#141414',
          foreground: '#fafafa',
        },
        popover: {
          DEFAULT: '#1a1a1a',
          foreground: '#fafafa',
        },
        primary: {
          DEFAULT: '#3b82f6',
          foreground: '#fafafa',
          light: '#60a5fa',
          dark: '#2563eb',
        },
        secondary: {
          DEFAULT: '#262626',
          foreground: '#e5e5e5',
        },
        muted: {
          DEFAULT: '#262626',
          foreground: '#a3a3a3',
        },
        accent: {
          DEFAULT: '#22c55e',
          foreground: '#052e16',
          light: '#4ade80',
          dark: '#16a34a',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#fafafa',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#1c1917',
        },
        success: {
          DEFAULT: '#22c55e',
          foreground: '#052e16',
        },
        border: '#262626',
        input: '#262626',
        ring: '#3b82f6',
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
      animation: {
        'pulse-slow': 'pulse 3s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
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
