/**
 * Tailwind CSS Configuration for JobFlow
 * 
 * This configuration aligns with the design system tokens defined in src/design/system.ts
 * to ensure a single source of truth for design values.
 * 
 * IMPORTANT: When updating tokens in src/design/system.ts, you must also update the
 * corresponding values in this file to maintain consistency. The values are manually
 * synced because Tailwind config files cannot directly import TypeScript modules.
 * 
 * The theme is designed for:
 * - Dark theme with orange accent
 * - Modern, professional appearance
 * - WCAG AA accessibility compliance
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Colors - GitHub-style dark + JobFlow orange (synced with src/design/system.ts)
      colors: {
        jobflow: '#ff7a1a',
        blueAccent: '#1f6feb',
        bgBody: '#020617',
        bgLayer1: '#050a1a',
        bgLayer2: '#0b1220',
        primary: {
          50: '#fef3f0',
          100: '#fde4dc',
          200: '#fbc8b8',
          300: '#f8a089',
          400: '#f56d4a',
          500: '#ff7a1a',
          600: '#e66d0f',
          700: '#c25a0c',
          800: '#9e4810',
          900: '#6e2614',
          950: '#3b0f08',
        },
        primarySoft: {
          DEFAULT: '#fef3f0',
          light: '#fde4dc',
          medium: '#fbc8b8',
        },
        primaryStrong: {
          DEFAULT: '#c93d16',
          medium: '#a73113',
          dark: '#862a14',
        },
        offWhite: {
          DEFAULT: '#FCF2DA',
          light: '#fef8f0',
          dark: '#f5e8c8',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        background: {
          default: '#020617',
          secondary: '#050a1a',
          tertiary: '#0b1220',
          dark: '#020617',
          'dark-secondary': '#050a1a',
        },
        surface: {
          DEFAULT: '#050a1a',
          alt: '#0b1220',
          elevated: '#151d2e',
        },
        surfaceAlt: {
          DEFAULT: '#0b1220',
          light: '#151d2e',
        },
        text: {
          primary: '#e5e7eb',
          secondary: '#9ca3af',
          tertiary: '#6b7280',
          inverse: '#020617',
          disabled: '#525252',
        },
        textMain: {
          DEFAULT: '#e5e7eb',
        },
        textMuted: {
          DEFAULT: '#9ca3af',
          light: '#6b7280',
        },
        border: {
          default: '#1e293b',
          hover: '#334155',
          focus: '#1f6feb',
          error: '#ef4444',
        },
        borderSubtle: {
          DEFAULT: '#1e293b',
          hover: '#334155',
        },
      },
      // Spacing - synced with src/design/system.ts
      spacing: {
        0: '0',
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
      },
      // Border radius - synced with src/design/system.ts
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        base: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      // Border width - synced with src/design/system.ts
      borderWidth: {
        0: '0',
        1: '1px',
        2: '2px',
        4: '4px',
        8: '8px',
      },
      // Shadows - synced with src/design/system.ts (adjusted for dark theme)
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        base: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.6), 0 4px 6px -4px rgb(0 0 0 / 0.6)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.7), 0 8px 10px -6px rgb(0 0 0 / 0.7)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.8)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)',
        none: 'none',
      },
      // Font family - synced with src/design/system.ts
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      // Font sizes - synced with src/design/system.ts (includes caption)
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        xs: ['0.75rem', { lineHeight: '1.25rem' }],
        sm: ['0.875rem', { lineHeight: '1.5rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        '5xl': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
        '6xl': ['3.75rem', { lineHeight: '1.1', fontWeight: '700' }],
      },
      // Font weights - synced with src/design/system.ts
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      // Breakpoints - synced with src/design/system.ts
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      // Z-index - synced with src/design/system.ts
      zIndex: {
        base: 0,
        dropdown: 1000,
        sticky: 1020,
        fixed: 1030,
        modalBackdrop: 1040,
        modal: 1050,
        popover: 1060,
        tooltip: 1070,
      },
      // Transitions - synced with src/design/system.ts
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

