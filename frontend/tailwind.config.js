/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#FF6B6B', // Cartoon Red
        'brand-secondary': '#4ECDC4', // Cartoon Teal
        'brand-yellow': '#FFE66D', // Cartoon Yellow
        'brand-dark': '#292F36', // Cartoon Black
        'brand-light': '#F7FFF7', // Off White
      },
      fontFamily: {
        'cartoon': ['"Comic Neue"', 'cursive', 'sans-serif'], 
        'sans': ['"Inter"', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      }
    },
  },
  plugins: [],
}
