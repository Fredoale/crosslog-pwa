/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'shine': {
          '0%': {
            transform: 'translateX(-100%)'
          },
          '100%': {
            transform: 'translateX(100%)'
          },
        },
        'pulse-zoom': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
          },
          '50%': {
            transform: 'scale(1.02)',
            boxShadow: '0 10px 25px -5px rgb(59 130 246 / 0.4), 0 8px 10px -6px rgb(59 130 246 / 0.3)'
          },
        },
        'pulse-border-glow': {
          '0%, 100%': {
            borderColor: 'rgb(229, 231, 235)',
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)'
          },
          '50%': {
            borderColor: 'rgb(96, 165, 250)',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1), 0 0 20px rgba(59, 130, 246, 0.2)'
          },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'shine': 'shine 1.5s ease-in-out',
        'pulse-zoom': 'pulse-zoom 2.5s ease-in-out infinite',
        'pulse-border-glow': 'pulse-border-glow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}