# Finishing Notes - Remaining TypeScript Fixes

This document lists the remaining TypeScript/build errors that need to be addressed before final deployment.

## Critical Fixes Needed

### 1. ImportMeta Environment Types

Create `src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 2. Analytics Event Type Narrowing

The analytics `track()` function needs better type narrowing. The union type causes issues when TypeScript can't determine which event type is being passed.

**Fix**: Use type assertions or helper functions for each event type:
```typescript
// In components, use explicit typing:
const event: Omit<OnboardingCompletedEvent, "timestamp" | "sessionId"> = {
  event: "onboarding_completed",
  // ... fields
}
await track(event)
```

### 3. Remove Unused Imports

The following unused imports should be removed:
- `ComplianceStatus` from ClaimantTable.tsx (line 12)
- `ActivityLogEntry` from WorkCoachDashboard.tsx (line 18)
- `TimeSeriesDataPoint` from DWPDashboard.tsx (line 16)
- `LogOut` from AppShell.tsx (line 17)
- `Badge` from FilterBar.tsx (line 11)
- `X` from FilterBar.tsx (line 14)
- Various other unused variables

### 4. Fix Unused Variables

- `progressPercentage` in ComplianceSummary.tsx
- `timeOnPage` in useAnalytics.ts
- `ref` in dialog.tsx
- `React` in sidebar-demo.tsx
- `UserCog` in sidebar-demo.tsx

## Build Command

Run `npm run build` to check all errors are resolved.

## Testing Checklist

- [ ] All TypeScript errors resolved
- [ ] Build completes successfully
- [ ] All pages load without console errors
- [ ] Analytics events track correctly
- [ ] No unused imports in final build

