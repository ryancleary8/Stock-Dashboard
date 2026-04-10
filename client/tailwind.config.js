/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#0f172a',
        accent: '#22c55e'
      }
    }
  },
  plugins: []
};
