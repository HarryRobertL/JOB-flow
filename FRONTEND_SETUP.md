# AutoApplyer Frontend Setup

This document describes the React/TypeScript frontend setup for AutoApplyer, including the design system and shadcn UI compatible components.

## Project Structure

```
autoapply/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn UI compatible components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── table.tsx
│   │   │   └── index.ts
│   │   └── layout/
│   │       └── AppShell.tsx # Main application layout
│   ├── design/
│   │   └── system.ts        # Design tokens (single source of truth)
│   ├── lib/
│   │   └── utils.ts         # Utility functions (cn helper)
│   ├── pages/
│   │   └── StatusPage.tsx   # Example page using design system
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── tailwind.config.js       # Tailwind config aligned with design tokens
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── package.json             # Dependencies
└── postcss.config.js        # PostCSS configuration
```

## Installation

1. Install Node.js dependencies:

```bash
npm install
```

2. The Python backend remains unchanged and can continue to run independently.

## Development

Start the development server:

```bash
npm run dev
```

This will start Vite on `http://localhost:5173` (or the next available port).

## Building

Build for production:

```bash
npm run build
```

Output will be in the `dist/` directory.

## Design System

See `src/DESIGN_SYSTEM.md` for detailed documentation on:
- Design tokens
- Component usage
- Color palette
- Accessibility guidelines

## Components

### UI Components

All components in `src/components/ui/` are shadcn UI compatible:

- **Button** - Accessible button with variants
- **Input** - Form input with focus states
- **Label** - Form label component
- **Card** - Container with header, content, footer
- **Dialog** - Modal dialog with focus management
- **Tabs** - Tab navigation
- **Table** - Accessible table components

### Layout Components

- **AppShell** - Main application shell with:
  - Responsive sidebar navigation
  - Top bar with user info and status
  - Content area with consistent spacing

## Integration with Backend

The React frontend is designed to work alongside the existing FastAPI backend:

1. **Current State**: FastAPI serves Jinja2 templates at `ui/templates/`
2. **Design System**: React components ready for use
3. **Migration Path**: Pages can be migrated gradually

### Example Integration

The FastAPI backend can serve the React app by:

1. Building the React app: `npm run build`
2. Serving the `dist/` directory as static files
3. Using React Router for client-side routing
4. Making API calls to FastAPI endpoints

## TypeScript

The project uses TypeScript with strict mode enabled. Path aliases are configured:

- `@/*` maps to `src/*`

Example:
```tsx
import { Button } from "@/components/ui"
```

## Tailwind CSS

Tailwind is configured with design tokens from `src/design/system.ts`. All color, spacing, and typography values align with the design system.

## Accessibility

All components are built with accessibility in mind:
- WCAG AA color contrast
- Keyboard navigation
- ARIA attributes
- Focus management
- Semantic HTML

## Next Steps

1. **Connect to Backend**: Set up API client to fetch data from FastAPI
2. **Add Routing**: Integrate React Router for navigation
3. **Migrate Pages**: Convert Jinja2 templates to React components
4. **Add Forms**: Implement form handling with validation
5. **State Management**: Add state management if needed (React Query, Zustand, etc.)

## Notes

- The design system is **future-proof** and ready for shadcn UI migration
- All existing backend routes and data flows are **preserved**
- No breaking changes to the Python backend
- Components are **production-ready** and follow best practices

