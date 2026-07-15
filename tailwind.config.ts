import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'from-teal-500',
    'to-purple-500',
    'from-orange-500',
    'to-red-500',
    'from-blue-500',
    'to-indigo-500',
    'from-green-500',
    'to-emerald-500',
    'from-yellow-500',
    'to-orange-500',
    'from-pink-500',
    'to-purple-500',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#13131A',
        elevated: '#1A1A24',
        teal: {
          DEFAULT: '#14B8A6',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        purple: {
          DEFAULT: '#A855F7',
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
        halal: {
          primary: '#16A085',
          'primary-dark': '#0F6F66',
          'primary-light': '#1ABC9C',
          gold: '#D4AF37',
          success: '#27AE60',
          warning: '#F39C12',
          danger: '#E74C3C',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
      },
      scale: {
        '98': '0.98',
      },
      animation: {
        blob1: 'blob1 20s ease-in-out infinite',
        blob2: 'blob2 25s ease-in-out infinite',
        blob3: 'blob3 30s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config

