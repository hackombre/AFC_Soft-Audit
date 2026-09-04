/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a1530',
          900: '#0d1b3e',
          800: '#102151',
          700: '#1a2c5b',
          600: '#1e3575',
        },
        brand: {
          50: '#f0f7ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        ink: {
          900: '#0d1b3e',
          700: '#374151',
          500: '#64748b',
          400: '#94a3b8',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafd',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,27,62,0.04), 0 8px 24px -8px rgba(13,27,62,0.08)',
        pop: '0 8px 24px rgba(13,27,62,0.14)',
      },
      borderRadius: {
        xl2: '1.1rem',
      },
    },
  },
  plugins: [],
};
