# Design System Notes

This document explains how to use the AutoApplyer design system and layout shells when adding new pages or components.

## Design Tokens

The design system is defined in `src/design/system.ts`. This is the single source of truth for:

- **Colors**: Primary, neutral, success, warning, error, info, background, text, and border colors
- **Spacing**: 4px-based scale (0-24) plus semantic variants (compact, regular, comfortable)
- **Typography**: Font families, sizes (with semantic naming), weights, and style presets
- **Border Radius**: Consistent rounded corners
- **Shadows**: Subtle, professional elevation
- **Breakpoints**: Responsive design breakpoints
- **Z-index**: Layering scale
- **Transitions**: Duration and timing functions

### Using Design Tokens

Design tokens are exported from `src/design/system.ts` and can be imported in TypeScript/React files:

```typescript
import { designTokens } from '@/design/system'

// Access colors
const primaryColor = designTokens.colors.primary[500]

// Access spacing
const padding = designTokens.spacing[4] // 1rem (16px)

// Access typography
const headingStyle = designTokens.typography.styles.h1
```

### Tailwind Integration

The Tailwind config (`tailwind.config.js`) imports design tokens to make them available as Tailwind utility classes. When updating tokens in `system.ts`, ensure the Tailwind config is also updated to maintain consistency.

**Note**: Due to Tailwind's build process, the config file uses manual value sync. When updating `system.ts`, update the corresponding values in `tailwind.config.js`.

## Layout Shells

All authenticated pages should use one of the app shells:

- **ClaimantAppShell**: For claimant users (`/app/*` routes)
- **CoachAppShell**: For work coach users (`/staff/work-coach/*` routes)
- **AdminAppShell**: For admin/DWP users (`/staff/dwp/*` and `/staff/admin/*` routes)

### App Shell Structure

All shells provide:
- **Sidebar Navigation**: Collapsible sidebar with role-specific navigation links
- **AppHeader**: Consistent header with app title, user info, and logout
- **Main Content Area**: Max-width container (7xl) with consistent padding

### Using App Shells

```tsx
import { ClaimantAppShell } from '@/components/layout/ClaimantAppShell'

function MyPage() {
  return (
    <ClaimantAppShell>
      {/* Your page content here */}
    </ClaimantAppShell>
  )
}
```

## Page Headers

Use the `PageHeader` component for consistent page titles and descriptions:

```tsx
import { PageHeader } from '@/components/layout/PageHeader'

function MyPage() {
  return (
    <ClaimantAppShell>
      <PageHeader
        title="My Page"
        subtitle="A brief description of what this page does"
        helperText="Optional helper text for additional context"
        actions={
          <Button>Action</Button>
        }
      />
      {/* Rest of page content */}
    </ClaimantAppShell>
  )
}
```

## Component Standards

### Buttons

Use the `Button` component with consistent variants:

- `default`: Primary action (blue background)
- `destructive`: Destructive actions (red background)
- `outline`: Secondary actions (outlined)
- `secondary`: Alternative secondary (gray background)
- `ghost`: Tertiary actions (no background)
- `link`: Link-style buttons

Sizes: `sm`, `default`, `lg`, `icon`

All buttons meet WCAG AA touch target requirements (minimum 44x44px on mobile, 40x40px on desktop).

### Cards

Use `Card`, `CardHeader`, `CardTitle`, `CardDescription`, and `CardContent` for consistent card layouts:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
</Card>
```

### Tables

Use the table components for data display:

```tsx
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data 1</TableCell>
      <TableCell>Data 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Typography

### Headings

- **H1**: `text-4xl` (36px) - Page titles
- **H2**: `text-3xl` (30px) - Section titles
- **H3**: `text-2xl` (24px) - Subsection titles
- **H4**: `text-xl` (20px) - Card titles

### Body Text

- **Primary**: `text-base` (16px) - Default body text
- **Secondary**: `text-sm` (14px) - Supporting text
- **Caption**: `text-xs` (12px) - Helper text, labels

Use semantic text colors:
- `text-text-primary` - Main text (#171717)
- `text-text-secondary` - Secondary text (#404040)
- `text-text-tertiary` - Tertiary text (#525252)

## Spacing

Use the spacing scale consistently:

- **Compact**: For dense UIs (tables, lists) - `p-2`, `p-3`, `gap-2`
- **Regular**: Default spacing - `p-4`, `p-6`, `gap-4`, `gap-6`
- **Comfortable**: For hero sections, large cards - `p-8`, `p-12`, `gap-8`

## Colors

### Semantic Colors

- **Primary**: `primary-500` (#0d8aff) - Main actions, links
- **Success**: `success-500` (#22c55e) - Success states
- **Warning**: `warning-500` (#f59e0b) - Warnings
- **Error**: `error-500` (#ef4444) - Errors, destructive actions
- **Info**: `info-500` (#3b82f6) - Informational content

### Background Colors

- `bg-background-default` - White (#ffffff)
- `bg-background-secondary` - Light gray (#fafafa)
- `bg-background-tertiary` - Lighter gray (#f5f5f5)

## Accessibility

All components are designed to meet WCAG AA standards:

- **Color Contrast**: All text meets 4.5:1 contrast ratio minimum
- **Touch Targets**: Interactive elements are at least 44x44px on mobile
- **Focus States**: All interactive elements have visible focus indicators
- **Semantic HTML**: Proper use of headings, landmarks, and ARIA attributes
- **Keyboard Navigation**: All interactive elements are keyboard accessible

## Responsive Design

The design system uses a mobile-first approach:

- **Mobile**: Default styles (no prefix)
- **Tablet**: `sm:` prefix (640px+)
- **Desktop**: `md:` (768px+), `lg:` (1024px+), `xl:` (1280px+)

### Content Width

All page content should be contained within:
- Max width: `max-w-7xl` (1280px)
- Padding: `px-4 sm:px-6 lg:px-8`
- Vertical spacing: `py-8` for main content areas

## Best Practices

1. **Use Design Tokens**: Always use tokens from `system.ts` or Tailwind utilities rather than hardcoded values
2. **Consistent Spacing**: Use the spacing scale consistently across components
3. **Semantic Colors**: Use semantic color names (primary, success, error) rather than raw colors
4. **Page Hierarchy**: Use `PageHeader` for page titles, then organize content into cards or sections
5. **Responsive First**: Design mobile-first, then enhance for larger screens
6. **Accessibility**: Ensure all interactive elements are keyboard accessible and have proper ARIA labels
7. **Consistent Components**: Use existing UI components rather than creating new ones

## Adding New Pages

When adding a new page:

1. Wrap content in the appropriate app shell (`ClaimantAppShell`, `CoachAppShell`, or `AdminAppShell`)
2. Add a `PageHeader` with title and optional subtitle
3. Organize content into `Card` components for visual hierarchy
4. Use consistent spacing and typography
5. Ensure responsive design works on mobile, tablet, and desktop
6. Test keyboard navigation and screen reader compatibility

## Example Page Structure

```tsx
import { ClaimantAppShell } from '@/components/layout/ClaimantAppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function MyNewPage() {
  return (
    <ClaimantAppShell>
      <PageHeader
        title="My New Page"
        subtitle="This page demonstrates the design system"
        actions={<Button>Take Action</Button>}
      />
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">Card content goes here</p>
          </CardContent>
        </Card>
      </div>
    </ClaimantAppShell>
  )
}
```

