/**
 * Design System - Technical Cyberpunk Theme
 * Inspired by Reactive.network's matrix-like interface
 * Monospace typography with electric green accent system
 */

export const theme = {
  colors: {
    // Dark Mode Foundation
    background: {
      base: 'hsl(12 8% 8%)',        // Deep charcoal #161312
      surface1: 'hsl(12 8% 12%)',   // Card backgrounds #211d1c
      surface2: 'hsl(12 8% 16%)',   // Elevated elements #2b2625
      border: 'hsl(12 8% 24%)',     // Dividers/grid #423b39
      overlay: 'rgba(0, 0, 0, 0.8)',
    },

    // Accent System
    accent: {
      primary: 'hsl(142 76% 48%)',    // Electric green #1de676 (active/success)
      secondary: 'hsl(210 100% 56%)', // Cyan #1eaaff (info/secondary)
      warning: 'hsl(38 92% 50%)',     // Amber #f59e0b (pending)
      error: 'hsl(0 84% 60%)',        // Red (errors/cancel)
    },

    // Text
    text: {
      primary: 'hsl(0 0% 98%)',     // Near white #fafafa
      secondary: 'hsl(0 0% 71%)',   // Muted gray #b5b5b5
      disabled: 'hsl(0 0% 45%)',    // Dim gray #737373
      inverse: '#000000',
    },

    // Semantic States
    status: {
      active: 'hsl(142 76% 48%)',   // Green
      filled: 'hsl(210 100% 56%)',  // Cyan
      cancelled: 'hsl(0 84% 60%)',  // Red
      pending: 'hsl(38 92% 50%)',   // Amber
    },
  },

  spacing: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
    xxxl: '48px',
    xxxxl: '64px',
  },

  typography: {
    fontFamily: {
      mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
    },
    fontSize: {
      xs: '0.75rem',      // 12px - Label/Caption
      sm: '0.875rem',     // 14px - Body small
      base: '1rem',       // 16px - Body
      lg: '1.125rem',     // 18px - H3
      xl: '1.25rem',      // 20px - H3
      '2xl': '1.5rem',    // 24px - H2
      '3xl': '1.875rem',  // 30px - H1
      '4xl': '2.25rem',   // 36px - H1
      '5xl': '3rem',      // 48px - Display
      '7xl': '4.5rem',    // 72px - Display
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.1,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.05em',
      wider: '0.1em',
      widest: '0.2em',
    },
  },

  borderRadius: {
    none: '0',
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
    glow: '0 0 8px rgba(29, 230, 118, 0.3)',
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

export type Theme = typeof theme;
