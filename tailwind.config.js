/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e0f7fa',
          100: '#b2ebf2',
          300: '#4dd0e1',
          500: '#00bcd4',
          600: '#00acc1',
          700: '#0097a7',
          900: '#006064',
        },
        accent: {
          400: '#d4e157',
          500: '#cddc39',
          600: '#c0ca33',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
