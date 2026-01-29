/**
 * JobFlow Design System
 * 
 * Central design tokens for the JobFlow application.
 * This file defines the single source of truth for colors, spacing, typography,
 * and other design tokens for a dark theme with orange accent.
 * 
 * These tokens are designed to:
 * - Meet WCAG AA accessibility standards for color contrast
 * - Provide a modern dark theme with orange accent
 * - Support dark mode throughout
 * - Align with Tailwind CSS configuration for consistency
 */

/**
 * GitHub-style dark theme tokens (2026-style layered dashboard).
 * Use for: page background, panels, borders, links, focus.
 * JobFlow orange remains the primary brand accent.
 */
export const githubDarkTokens = {
  brand: {
    jobflowOrange: '#ff7a1a',
    blueAccent: '#1f6feb',
  },
  surface: {
    body: '#020617',
    layer1: '#050a1a',
    layer2: '#0b1220',
  },
  border: {
    subtle: '#1e293b',
  },
  text: {
    main: '#e5e7eb',
    muted: '#9ca3af',
  },
} as const

export const designTokens = {
  // Color Palette - JobFlow dark theme with orange accent
  colors: {
    // JobFlow orange (primary brand) - #ff7a1a per spec, primary kept for compatibility
    jobflow: githubDarkTokens.brand.jobflowOrange,
    blueAccent: githubDarkTokens.brand.blueAccent,
    bgBody: githubDarkTokens.surface.body,
    bgLayer1: githubDarkTokens.surface.layer1,
    bgLayer2: githubDarkTokens.surface.layer2,
    // Primary - JobFlow orange (alias, keep scale for hover/active)
    primary: {
      50: '#fef3f0',
      100: '#fde4dc',
      200: '#fbc8b8',
      300: '#f8a089',
      400: '#f56d4a',
      500: '#ff7a1a', // JobFlow orange - main accent
      600: '#e66d0f',
      700: '#c25a0c',
      800: '#9e4810',
      900: '#6e2614',
      950: '#3b0f08',
    },
    // Semantic primary aliases
    primarySoft: {
      DEFAULT: '#fef3f0',  // primary-50
      light: '#fde4dc',   // primary-100
      medium: '#fbc8b8',  // primary-200
    },
    primaryStrong: {
      DEFAULT: '#c93d16',  // primary-600
      medium: '#a73113',   // primary-700
      dark: '#862a14',     // primary-800
    },
    
    // Off-white accent color (#FCF2DA)
    offWhite: {
      DEFAULT: '#FCF2DA',
      light: '#fef8f0',
      dark: '#f5e8c8',
    },
    
    // Neutral grays - Clean and professional
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
    
    // Semantic colors with accessible contrast
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Main success
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
      500: '#f59e0b', // Main warning
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },
    
    // Error/Danger - semantic alias
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main error
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
      500: '#ef4444', // Main danger (alias for error)
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
      500: '#3b82f6', // Main info
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    
    // Background colors - GitHub-style dark (layered)
    background: {
      default: githubDarkTokens.surface.body,
      secondary: githubDarkTokens.surface.layer1,
      tertiary: githubDarkTokens.surface.layer2,
      dark: githubDarkTokens.surface.body,
      'dark-secondary': githubDarkTokens.surface.layer1,
    },
    // Semantic surface aliases - GitHub-style layers
    surface: {
      DEFAULT: githubDarkTokens.surface.layer1,
      alt: githubDarkTokens.surface.layer2,
      elevated: '#151d2e',    // Slightly lighter than layer2 for elevation
    },
    surfaceAlt: {
      DEFAULT: githubDarkTokens.surface.layer2,
      light: '#151d2e',
    },
    
    // Text colors - GitHub-style slate/grey
    text: {
      primary: githubDarkTokens.text.main,
      secondary: githubDarkTokens.text.muted,
      tertiary: '#6b7280',    // Slightly muted for tertiary
      inverse: githubDarkTokens.surface.body,
      disabled: '#525252',
    },
    // Semantic text aliases
    textMain: {
      DEFAULT: githubDarkTokens.text.main,
    },
    textMuted: {
      DEFAULT: githubDarkTokens.text.muted,
      light: '#6b7280',
    },
    
    // Border colors - GitHub-style subtle
    border: {
      default: githubDarkTokens.border.subtle,
      hover: '#334155',
      focus: githubDarkTokens.brand.blueAccent,  // Blue focus ring
      error: '#ef4444',
    },
    // Semantic border alias
    borderSubtle: {
      DEFAULT: githubDarkTokens.border.subtle,
      hover: '#334155',
    },
  },
  
  // Spacing scale (4px base unit)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
  
  // Semantic spacing variants
  spacingVariants: {
    // Compact spacing - for dense UIs, tables, lists
    compact: {
      xs: '0.25rem',   // 4px
      sm: '0.5rem',    // 8px
      md: '0.75rem',   // 12px
      lg: '1rem',      // 16px
    },
    // Regular spacing - default for most components
    regular: {
      xs: '0.5rem',    // 8px
      sm: '0.75rem',   // 12px
      md: '1rem',      // 16px
      lg: '1.5rem',    // 24px
      xl: '2rem',      // 32px
    },
    // Comfortable spacing - for hero sections, large cards
    comfortable: {
      xs: '0.75rem',   // 12px
      sm: '1rem',      // 16px
      md: '1.5rem',    // 24px
      lg: '2rem',      // 32px
      xl: '3rem',      // 48px
    },
  },
  
  // Typography
  typography: {
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
    
    // Font sizes with semantic naming
    fontSize: {
      // Caption text - smallest readable text
      caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],      // 12px
      // Body text sizes
      xs: ['0.75rem', { lineHeight: '1.25rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.5rem' }],       // 14px - secondary body
      base: ['1rem', { lineHeight: '1.5rem' }],          // 16px - primary body
      lg: ['1.125rem', { lineHeight: '1.75rem' }],     // 18px - emphasized body
      // Heading sizes
      xl: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],  // 20px - h4
      '2xl': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],    // 24px - h3
      '3xl': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }], // 30px - h2
      '4xl': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],   // 36px - h1
      '5xl': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],         // 48px - hero
      '6xl': ['3.75rem', { lineHeight: '1.1', fontWeight: '700' }],      // 60px - display
    },
    
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    // Semantic typography styles - aligned with visual system plan
    styles: {
      // Page title (H1) - Main page title in PageHeader
      pageTitle: {
        fontSize: '1.875rem',     // 30px (text-3xl)
        lineHeight: '2.25rem',    // leading-tight
        fontWeight: '700',        // font-bold
        letterSpacing: '-0.01em',
      },
      // Section title (H2) - Major sections, card titles
      sectionTitle: {
        fontSize: '1.5rem',        // 24px (text-2xl)
        lineHeight: '2rem',       // leading-tight
        fontWeight: '600',        // font-semibold
      },
      // Card title (H3) - Card titles, subsections
      cardTitle: {
        fontSize: '1.25rem',       // 20px (text-xl)
        lineHeight: '1.75rem',    // leading-snug
        fontWeight: '600',        // font-semibold
      },
      // Small heading (H4)
      smallHeading: {
        fontSize: '1.125rem',      // 18px (text-lg)
        lineHeight: '1.75rem',    // leading-normal
        fontWeight: '500',        // font-medium
      },
      // Body text
      body: {
        fontSize: '1rem',         // 16px (text-base)
        lineHeight: '1.5rem',     // leading-normal
        fontWeight: '400',        // font-normal
      },
      // Small body text
      small: {
        fontSize: '0.875rem',      // 14px (text-sm)
        lineHeight: '1.5rem',     // leading-normal
        fontWeight: '400',        // font-normal
      },
      // Caption and helper text
      caption: {
        fontSize: '0.75rem',       // 12px (text-xs)
        lineHeight: '1rem',       // leading-tight
        fontWeight: '400',        // font-normal
        letterSpacing: '0.01em',
      },
      // Legacy aliases for backward compatibility
      h1: {
        fontSize: '1.875rem',      // 30px (matches pageTitle)
        lineHeight: '2.25rem',
        fontWeight: '700',
        letterSpacing: '-0.01em',
      },
      h2: {
        fontSize: '1.5rem',       // 24px (matches sectionTitle)
        lineHeight: '2rem',
        fontWeight: '600',
      },
      h3: {
        fontSize: '1.25rem',       // 20px (matches cardTitle)
        lineHeight: '1.75rem',
        fontWeight: '600',
      },
      h4: {
        fontSize: '1.125rem',      // 18px (matches smallHeading)
        lineHeight: '1.75rem',
        fontWeight: '500',
      },
      bodySmall: {
        fontSize: '0.875rem',      // 14px (matches small)
        lineHeight: '1.5rem',
        fontWeight: '400',
      },
    },
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },
  
  // Border width
  borderWidth: {
    0: '0',
    1: '1px',
    2: '2px',
    4: '4px',
    8: '8px',
  },
  
  // Shadows - Subtle and professional (adjusted for dark theme)
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.6), 0 4px 6px -4px rgb(0 0 0 / 0.6)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.7), 0 8px 10px -6px rgb(0 0 0 / 0.7)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.8)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)',
    none: 'none',
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Z-index scale
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
  
  // Transitions
  transitions: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
    },
    timing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
} as const;

// Export type for TypeScript usage
export type DesignTokens = typeof designTokens;

