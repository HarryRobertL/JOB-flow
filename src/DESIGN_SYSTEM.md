# AutoApplyer Design System

This document describes the design system setup for AutoApplyer, providing a foundation for building a trustworthy, accessible civic tech interface suitable for DWP and public sector clients.

## Overview

The design system is built on:
- **React** with TypeScript
- **Tailwind CSS** for styling
- **shadcn UI** compatible components
- **Design tokens** as the single source of truth

## Design Tokens

All design tokens are defined in `src/design/system.ts`. These tokens include:

- **Colors**: Primary, neutral, semantic (success, warning, error, info), background, text, and border colors
- **Spacing**: 4px-based scale (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24)
- **Typography**: Font families, sizes, weights, and line heights
- **Border Radius**: Consistent rounding values
- **Shadows**: Subtle, professional elevation
- **Breakpoints**: Responsive design breakpoints
- **Z-index**: Layering scale for modals, dropdowns, etc.

### Color Palette

The color palette is designed for:
- **WCAG AA accessibility compliance** - All text colors meet contrast requirements
- **Trustworthy civic tech aesthetic** - Clean, neutral, professional
- **Public sector suitability** - Appropriate for DWP and government clients

Primary colors use a professional blue (`#0d8aff`), while semantic colors provide clear feedback (green for success, amber for warnings, red for errors).

## Components

### UI Components (`src/components/ui/`)

All components are shadcn UI compatible and follow consistent patterns:

- **Button** - Multiple variants (default, destructive, outline, secondary, ghost, link)
- **Input** - Accessible form inputs with focus states
- **Label** - Form labels with proper semantics
- **Card** - Container components (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- **Dialog** - Accessible modal dialogs with focus management
- **Tabs** - Tab navigation components
- **Table** - Accessible table components

### Layout Components (`src/components/layout/`)

- **AppShell** - Main application layout with:
  - Left sidebar navigation (responsive, hidden on mobile)
  - Top bar with app title, user name, and status indicator
  - Content area with consistent padding and max width

## Usage

### Importing Components

```tsx
import { Button, Card, CardContent } from "@/components/ui"
import { AppShell } from "@/components/layout/AppShell"
```

### Using Design Tokens

```tsx
import { designTokens } from "@/design/system"

// Access tokens programmatically
const primaryColor = designTokens.colors.primary[500]
const spacing = designTokens.spacing[4]
```

### Using Tailwind Classes

The Tailwind config is aligned with design tokens, so you can use:

```tsx
<div className="bg-primary-500 text-white p-4 rounded-lg">
  Content
</div>
```

## Tailwind Configuration

The `tailwind.config.js` file mirrors the design tokens from `src/design/system.ts`. When updating tokens:

1. Update `src/design/system.ts` (the source of truth)
2. Update `tailwind.config.js` to match (for Tailwind to recognize the values)

## Example: Status Page

See `src/pages/StatusPage.tsx` for a complete example of:
- Using the AppShell layout
- Displaying statistics with Card components
- Using Button components for actions
- Responsive design patterns

## Migration Path

The design system is set up to allow gradual migration from the existing Jinja2 templates:

1. **Current State**: Python FastAPI backend with Jinja2 templates in `ui/templates/`
2. **Design System Ready**: React components and design tokens are in place
3. **Future Migration**: Pages can be migrated one at a time to React components

The existing backend routes and data flows remain unchanged. The React frontend can be integrated alongside or replace the templates as needed.

## Accessibility

All components are built with accessibility in mind:

- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Color contrast compliance (WCAG AA)
- Semantic HTML

## Responsive Design

The design system supports:
- **Mobile**: < 640px (sidebar hidden, mobile menu)
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px (sidebar visible)

Breakpoints are defined in the design tokens and Tailwind config.

## Next Steps

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`
4. Migrate additional pages using the StatusPage as a reference

