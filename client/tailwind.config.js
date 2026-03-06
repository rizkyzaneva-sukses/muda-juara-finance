/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0d14',
          800: '#0f1320',
          700: '#141928',
          600: '#1a2035',
          500: '#202640',
          400: '#2a3352',
        },
        gold: {
          500: '#f0a500',
          400: '#f5bc30',
          300: '#f9d060',
        },
        emerald: {
          500: '#10b981',
          400: '#34d399',
        }
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  },
  plugins: []
};
