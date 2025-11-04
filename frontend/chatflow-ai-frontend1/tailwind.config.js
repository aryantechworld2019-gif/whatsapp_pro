/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scans all our component files
  ],
  theme: {
    extend: {
      // Per our GTM plan, we create a premium feel
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'brand-primary': '#4F46E5', // A strong, professional purple/blue
        'brand-light': '#F9FAFB', // A very light grey for backgrounds
        'brand-dark': '#1F2937', // Our primary text color
      },
    },
  },
  plugins: [],
}

