/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce8ff',
          200: '#b8d1ff',
          300: '#8fb4ff',
          400: '#5c8dff',
          500: '#3366ff',
          600: '#254edb',
          700: '#1c3bab',
          800: '#182f85',
          900: '#152867',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(16, 24, 40, 0.10)',
      },
    },
  },
  plugins: [],
}
