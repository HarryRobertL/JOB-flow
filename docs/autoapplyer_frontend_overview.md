# AutoApplyer Frontend Overview

This document provides an overview of the AutoApplyer frontend application structure, architecture, and development workflow.

## Technology Stack

- **Framework**: React 18.2 with TypeScript
- **Build Tool**: Vite 5.0
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui (custom built on top of Radix UI primitives)
- **Icons**: lucide-react
- **Animation**: framer-motion (for sidebar and transitions)

## Application Structure

```
src/
├── components/          # React components organized by domain
│   ├── applications/    # Application review and submission components
│   ├── dashboard/       # Dashboard-specific components (compliance, tasks, timeline)
│   ├── forms/           # Form field components (with error handling)
│   ├── jobsearch/       # Job search filter components
│   ├── layout/          # Layout components (AppShell, navigation)
│   ├── onboarding/      # Onboarding flow components
│   ├── pwa/             # PWA-related components (install prompt, offline)
│   ├── shared/          # Shared components used across multiple pages
│   └── ui/              # Base UI components (buttons, cards, badges, etc.)
├── design/              # Design system tokens and utilities
├── lib/                 # Utility functions and hooks
│   ├── analytics.ts     # Analytics event tracking
│   ├── useAnalytics.ts  # React hook for analytics
│   └── utils.ts         # General utilities (className merging, etc.)
├── pages/               # Top-level page components
└── types/               # TypeScript type definitions
```

## Main Routes and Pages

### Claimant Routes

1. **OnboardingPage** (`/onboarding`)
   - Multi-step onboarding flow for new claimants
   - Collects profile, skills, location, and automation preferences
   - Tracks analytics: `onboarding_completed`

2. **ClaimantDashboard** (`/dashboard`)
   - Main dashboard showing compliance summary, upcoming tasks, and activity timeline
   - Tracks analytics: `dashboard_viewed` (type: "claimant")

3. **StatusPage** (`/status`)
   - Application statistics and run status
   - Displays KPI cards for total, applied, skipped, and error counts

4. **ApplicationBatchConfirmationPage** (`/applications/confirm`)
   - Review and confirm batch of applications before submission
   - Tracks analytics: `application_submitted`

### Staff Routes

5. **WorkCoachDashboard** (`/work-coach`)
   - Dashboard for work coaches to manage assigned claimants
   - Features filtering, sorting, and detailed claimant view with activity log
   - Tracks analytics: `dashboard_viewed` (type: "work_coach")

6. **DWPDashboard** (`/dwp`)
   - Regional/central DWP dashboard with aggregated metrics
   - KPI cards, time series data, and pilot vs control comparisons
   - Tracks analytics: `dashboard_viewed` (type: "dwp")

## Design System

### Color Palette

The application uses a consistent color system defined in `tailwind.config.js`:

- **Primary**: Blue tones for primary actions and branding
- **Success**: Green tones for positive states (on track, applied)
- **Warning**: Amber/yellow tones for caution states (at risk, pending)
- **Error**: Red tones for errors and non-compliance
- **Neutral**: Grays for text, borders, and backgrounds
- **Info**: Blue tones for informational messages

### Typography

- **Headings**: Bold, tight tracking
  - Page titles: `text-3xl font-bold`
  - Section titles: `text-xl font-semibold` or `text-lg font-semibold`
- **Body**: Regular weight, readable line height
  - Primary text: `text-text-primary`
  - Secondary text: `text-text-secondary`
  - Tertiary text: `text-text-tertiary`

### Spacing Scale

Consistent spacing using Tailwind's scale (4px increments):
- Small gaps: `gap-2`, `gap-3`, `gap-4` (8-16px)
- Medium gaps: `gap-6` (24px) - most common for section spacing
- Large gaps: `gap-8`, `gap-12` (32-48px) for major sections

### Component Patterns

#### Page Layout

All pages use the `AppShell` component which provides:
- Consistent sidebar navigation (desktop: hover to expand, mobile: slide-in)
- Top bar with user name and status indicator
- Footer with help and policy links
- Responsive content area with max-width and padding

#### Page Headers

All pages use the `PageHeader` component for consistent titles:
```tsx
<PageHeader
  title="Page Title"
  description="Optional description text"
  actions={<Button>Action</Button>} // Optional action buttons
/>
```

#### Status Indicators

Status badges use the `StatusBadge` component with consistent color mapping:
- Compliance: `on_track` (green), `at_risk` (amber), `non_compliant` (red)
- Applications: `submitted` (green), `pending_review` (amber), `rejected` (red)
- Activity: `applied` (green), `skipped` (amber), `error` (red)

#### Cards

Use shadcn Card components:
- Standard cards: `<Card>` with `<CardHeader>`, `<CardTitle>`, `<CardContent>`
- Colored variants: Add className like `border-success-200 bg-success-50` for colored backgrounds

#### Error States

Use `ErrorState` component for consistent error messaging:
```tsx
<ErrorState
  title="Error title"
  message="User-friendly error message"
  affectsCompliance={true} // Optional flag for compliance-related errors
  onRetry={() => {}} // Optional retry handler
/>
```

#### Empty States

Use `EmptyState` component for empty lists:
```tsx
<EmptyState
  title="No items found"
  description="Helpful guidance for the user"
  icon={<Icon />} // Optional
  action={<Button>Action</Button>} // Optional
/>
```

## shadcn/ui Components

The application uses shadcn/ui components (custom-built, not a library). Key components:

- **Button**: `<Button variant="default" | "outline" | "ghost">`
- **Card**: `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<CardFooter>`
- **Badge**: `<Badge variant="default" | "success" | "warning" | "error" | "info" | "outline">`
- **Input**: `<Input type="text" | "email" | "tel" | "number">`
- **Select**: `<Select>` with `<option>` children
- **Textarea**: `<Textarea rows={6}>`
- **Dialog**: Modal dialogs with `<Dialog>`, `<DialogContent>`, `<DialogHeader>`, etc.
- **Table**: Accessible tables with `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>`
- **Progress**: Progress bars with `<Progress value={50} max={100}>`

All components are located in `src/components/ui/` and can be customized via Tailwind classes.

## Development Workflow

### Running the Development Server

```bash
npm run dev
```

Starts Vite dev server with hot module replacement on `http://localhost:5173`

### Building for Production

```bash
npm run build
```

Outputs production build to `dist/` directory.

### Linting

```bash
npm run lint
```

Runs ESLint with TypeScript support.

### Type Checking

```bash
npx tsc --noEmit
```

Checks TypeScript types without emitting files.

## Key Features

### Analytics

The frontend includes a comprehensive analytics system for tracking user behavior:

- **Module**: `src/lib/analytics.ts` - Central analytics service
- **Hook**: `src/lib/useAnalytics.ts` - React hook for tracking events
- **Events Tracked**:
  - `onboarding_completed`
  - `job_search_performed`
  - `application_submitted`
  - `log_exported`
  - `dashboard_viewed`

See `docs/analytics_events.md` for full documentation.

### Responsive Design

All pages are fully responsive:
- **Mobile**: Single column layout, collapsible sidebar
- **Tablet**: Two-column layouts where appropriate
- **Desktop**: Multi-column grids, expanded sidebar

### Accessibility

- WCAG AA compliant
- Keyboard navigation throughout
- ARIA labels and roles
- Focus indicators on all interactive elements
- Screen reader support

### Progressive Web App (PWA)

- Service worker for offline support
- Install prompt component
- Manifest configured for app-like experience

## State Management

Currently uses React's built-in state management:
- `useState` for component-level state
- `useEffect` for side effects and data fetching
- Props for parent-child communication

Future: Consider adding React Query or similar for server state management as the application grows.

## API Integration

The frontend expects a backend API (FastAPI/Express) with endpoints:
- `/api/analytics` - POST analytics events
- Staff dashboard endpoints (to be defined)

API calls should use `fetch` with proper error handling.

## Code Organization Principles

1. **Component Co-location**: Keep related components, types, and styles together
2. **Single Responsibility**: Each component should do one thing well
3. **Composition over Configuration**: Build complex UIs from simple, composable components
4. **Type Safety**: Use TypeScript types for all props and data structures
5. **Accessibility First**: Build accessible components by default

## Extending the Application

### Adding a New Page

1. Create component in `src/pages/`
2. Add route in `src/App.tsx` (or router configuration)
3. Use `AppShell` for consistent layout
4. Use `PageHeader` for title/description
5. Track analytics if appropriate

### Adding a New Shared Component

1. Create component in `src/components/shared/`
2. Export from `src/components/shared/index.ts`
3. Follow existing component patterns (props interface, TypeScript, accessibility)
4. Document usage in component JSDoc

### Adding Analytics Events

1. Define event type in `src/lib/analytics.ts`
2. Add to `AnalyticsEvent` union type
3. Track using `useAnalytics()` hook
4. Document in `docs/analytics_events.md`

## Testing

While not currently implemented, recommended testing approach:
- **Unit Tests**: Jest + React Testing Library for components
- **Integration Tests**: Test user flows end-to-end
- **E2E Tests**: Playwright or Cypress for critical paths

## Deployment

The frontend is configured for Vercel deployment:
- `vercel.json` configures SPA routing
- Build command: `npm run build`
- Output directory: `dist/`

For other platforms, ensure:
- SPA routing is configured (all routes serve `index.html`)
- Static assets are served correctly
- Environment variables are set for analytics endpoints

## Additional Resources

- **Design System**: See `src/DESIGN_SYSTEM.md`
- **Analytics Events**: See `docs/analytics_events.md`
- **Staff Dashboards**: See `docs/STAFF_DASHBOARDS.md`
- **PWA Features**: See `docs/pwa.md`
- **Accessibility**: See `docs/accessibility_notes.md`

