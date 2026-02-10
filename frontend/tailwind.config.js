/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'rajdhani': ['Rajdhani', 'Space Grotesk', 'sans-serif'],
        'body': ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Blaze Brand Colors
        background: '#050A18', // Deep Midnight
        foreground: '#FFFFFF', // Electric White
        card: {
          DEFAULT: '#0D1526', // Slightly lighter than background
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#0D1526',
          foreground: '#FFFFFF',
        },
        primary: {
          DEFAULT: '#FF0000', // Blaze Red
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#FFFFFF', // Electric White
          foreground: '#050A18',
        },
        muted: {
          DEFAULT: '#2D3436', // Circuit Grey
          foreground: '#A1A1AA',
        },
        accent: {
          DEFAULT: '#FFD700', // Golden Coin
          foreground: '#050A18',
        },
        success: {
          DEFAULT: '#22C55E',
        },
        destructive: {
          DEFAULT: '#FF3B30',
          foreground: '#FFFFFF',
        },
        border: '#2D3436', // Circuit Grey
        input: '#2D3436',
        ring: '#FF0000', // Blaze Red
        // Additional Blaze colors
        blaze: {
          red: '#FF0000',
          white: '#FFFFFF',
          gold: '#FFD700',
          midnight: '#050A18',
          grey: '#2D3436',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'neon-red': '0 0 20px rgba(255, 0, 0, 0.4)',
        'neon-gold': '0 0 20px rgba(255, 215, 0, 0.4)',
        'neon-white': '0 0 20px rgba(255, 255, 255, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'flame': 'flame 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 0, 0, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 0, 0, 0.6)' },
        },
        flame: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
