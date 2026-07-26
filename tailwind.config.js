/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#101826',        // near-black navy — primary background
        paper: '#EEE9DC',      // aged paper — card surfaces
        paperdim: '#DCD5C2',
        record: '#1B2A3D',     // secondary ink surface
        gold: '#B8862E',       // official-record accent
        verified: '#3F6B4F',   // court_confirmed / published
        pending: '#B8862E',    // under_investigation
        alleged: '#8C7A4E',    // alleged / draft
        flagged: '#8B2E2E',    // rejected / high-severity
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
