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
        background: '#050505',
        card: '#0A0A0B',
        popover: '#0A0A0B',
        primary: {
          DEFAULT: '#7C3AED',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#00E5FF',
          foreground: '#000000',
        },
        muted: {
          DEFAULT: '#18181B',
          foreground: '#A1A1AA',
        },
        accent: {
          DEFAULT: '#FACC15',
          foreground: '#000000',
        },
        success: {
          DEFAULT: '#00FF94',
        },
        destructive: {
          DEFAULT: '#FF3B30',
          foreground: '#FFFFFF',
        },
        border: '#27272A',
        input: '#27272A',
        ring: '#7C3AED',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(124, 58, 237, 0.4)',
        'neon-cyan': '0 0 20px rgba(0, 229, 255, 0.4)',
        'neon-yellow': '0 0 20px rgba(250, 204, 21, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(124, 58, 237, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.6)' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
