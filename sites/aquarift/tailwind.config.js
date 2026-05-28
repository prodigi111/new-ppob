/** @type {import('tailwindcss').Config} */
// Colors & typography sourced from src/theme.config.js so each cloned site
// only edits ONE file. See /app/scripts/clone-site.sh for the replication tool.
const theme = require('./src/theme.config.js');

module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'rajdhani':  theme.fonts.display.replace(/'/g, '').split(',').map(s => s.trim()),
        'display':   theme.fonts.display.replace(/'/g, '').split(',').map(s => s.trim()),
        'body':      theme.fonts.body.replace(/'/g, '').split(',').map(s => s.trim()),
        'mono':      theme.fonts.mono.replace(/'/g, '').split(',').map(s => s.trim()),
      },
      colors: {
        background: theme.colors.background,
        foreground: theme.colors.foreground,
        card: {
          DEFAULT: theme.colors.card,
          foreground: theme.colors.foreground,
        },
        popover: {
          DEFAULT: theme.colors.card,
          foreground: theme.colors.foreground,
        },
        primary: {
          DEFAULT: theme.colors.primary,
          foreground: theme.colors.foreground,
        },
        secondary: {
          DEFAULT: theme.colors.secondary,
          foreground: theme.colors.background,
        },
        muted: {
          DEFAULT: theme.colors.border,
          foreground: '#A1A1AA',
        },
        accent: {
          DEFAULT: theme.colors.accent,
          foreground: theme.colors.background,
        },
        success: {
          DEFAULT: theme.colors.success,
        },
        destructive: {
          DEFAULT: theme.colors.destructive,
          foreground: '#FFFFFF',
        },
        border: theme.colors.border,
        input: theme.colors.border,
        ring: theme.colors.primary,
        // Brand-specific palette tokens (kept for backward compat / utilities)
        blaze: {
          red:      theme.colors.primary,
          white:    theme.colors.secondary,
          gold:     theme.colors.accent,
          midnight: theme.colors.background,
          grey:     theme.colors.border,
        },
        brand: {
          primary:   theme.colors.primary,
          secondary: theme.colors.secondary,
          accent:    theme.colors.accent,
          bg:        theme.colors.background,
          card:      theme.colors.card,
          border:    theme.colors.border,
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'neon-red':   `0 0 20px ${theme.colors.primary}66`,
        'neon-gold':  `0 0 20px ${theme.colors.accent}66`,
        'neon-white': `0 0 20px ${theme.colors.secondary}33`,
        'brand':      `0 0 20px ${theme.colors.primary}66`,
        'brand-lg':   `0 0 40px ${theme.colors.primary}80`,
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'flame':      'flame 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: `0 0 5px ${theme.colors.primary}33` },
          '100%': { boxShadow: `0 0 20px ${theme.colors.primary}99` },
        },
        flame: {
          '0%':   { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
