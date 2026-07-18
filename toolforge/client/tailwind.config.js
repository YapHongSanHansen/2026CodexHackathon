/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0e1a',
          900: '#0d1424',
          800: '#131c30',
          700: '#1b2740',
          600: '#26344f',
        },
        forge: {
          400: '#5eead4',
          500: '#2dd4bf',
          600: '#14b8a6',
        },
        ember: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
