/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark surfaces
        bg:     '#0b0e17',
        surf1:  '#121622',
        surf2:  '#1a1f30',
        surf3:  '#222840',
        // Team colors
        teamA:  '#3b8bff',
        teamB:  '#ff6b35',
        // Accents
        green:  '#22d47a',
        red:    '#f04e4e',
        amber:  '#f5c542',
        purple: '#a78bfa',
        slate:  '#64748b',
        // Text
        text:   '#e8eaf2',
        muted:  '#7a829a',
        subtle: '#3c4260',
        // Court
        court:  '#c8a55a',
      },
      fontFamily: {
        condensed: ['"Barlow Condensed"', 'sans-serif'],
        sans: ['Barlow', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.07)',
        medium:  'rgba(255,255,255,0.13)',
      },
      boxShadow: {
        'glow-a': '0 0 20px rgba(59,139,255,0.35)',
        'glow-b': '0 0 20px rgba(255,107,53,0.35)',
        'glow-green': '0 0 20px rgba(34,212,122,0.35)',
      },
    },
  },
  plugins: [],
};
