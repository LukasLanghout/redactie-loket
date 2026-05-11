/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Pointer-inspired accent (warm red, like KRO-NCRV's brand)
        pointer: {
          DEFAULT: '#E63946',
          foreground: '#FFFFFF',
          50: '#fdecee',
          100: '#fbd5d9',
          300: '#f08a92',
          500: '#E63946',
          600: '#c92d39',
          700: '#a8222d',
        },
        // Keep brand teal for legacy components (gradually replaced)
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
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
