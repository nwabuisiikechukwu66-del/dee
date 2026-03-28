/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F9F5EE',
          50: '#FDFBF8',
          100: '#F9F5EE',
          200: '#F0E8D5',
          300: '#E5D5B8',
          400: '#D4C4A8',
        },
        cognac: {
          DEFAULT: '#7C5C3A',
          light: '#9E6F45',
          dark: '#5C3E22',
        },
        amber: {
          warm: '#C8884A',
          light: '#E5B068',
          deep: '#A86830',
        },
        ink: {
          DEFAULT: '#2C2416',
          muted: '#5C4A2E',
          light: '#9E8E7A',
        },
        surface: {
          DEFAULT: '#F2EAD8',
          elevated: '#EDE2CC',
          dark: '#1A130A',
        },
      },
      fontFamily: {
        serif: ['"IM Fell English"', 'Garamond', 'Georgia', 'serif'],
        mono: ['"DM Mono"', '"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 1.6s ease-in-out infinite',
        'wave-1': 'wave 0.8s ease-in-out infinite alternate',
        'wave-2': 'wave 0.8s ease-in-out 0.12s infinite alternate',
        'wave-3': 'wave 0.8s ease-in-out 0.24s infinite alternate',
        'wave-4': 'wave 0.8s ease-in-out 0.36s infinite alternate',
        'wave-5': 'wave 0.8s ease-in-out 0.48s infinite alternate',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'ken-burns': 'kenBurns 12s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: 'calc(400px + 100%) 0' },
        },
        wave: {
          '0%': { height: '20%' },
          '100%': { height: '100%' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        kenBurns: {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.04)' },
        },
      },
      boxShadow: {
        card: '0 2px 12px rgba(44,36,22,0.08)',
        'card-hover': '0 4px 20px rgba(44,36,22,0.14)',
        cover: '0 8px 32px rgba(44,36,22,0.25)',
        player: '0 -4px 32px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
