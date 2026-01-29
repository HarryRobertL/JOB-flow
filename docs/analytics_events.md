# Analytics Events Documentation

This document describes the analytics events tracked in the AutoApplyer frontend application. Events are designed to be privacy-safe, focusing on aggregate behavior and compliance-relevant metadata rather than personal identifying information (PII).

## Overview

The analytics system tracks key user actions to enable:
- **Aggregate behavior analysis**: Understanding how claimants use the system
- **Compliance tracking**: Monitoring actions relevant to DWP requirements
- **Usage data for pilots**: High-quality metrics for future DWP pilot evaluations

## Architecture

### Core Module

The analytics system is built around:
- **`src/lib/analytics.ts`**: Central analytics module with event schema and dispatcher
- **`src/lib/useAnalytics.ts`**: React hook for easy component integration

### Event Dispatchers

Events can be dispatched to multiple backends:
- **Console dispatcher**: Logs to browser console (development/debug mode)
- **API dispatcher**: Sends events to backend endpoint (production)
- **Null dispatcher**: No-op for testing or when analytics is disabled

### Privacy & Security

- **No PII**: Events never include full names, email addresses, or other personal details
- **Pseudonymized IDs**: Claimants are identified by hashed/pseudonymized identifiers
- **Metadata only**: Focus on counts, categories, and high-level behavior patterns
- **Sanitized user agent**: Only browser family (chrome, firefox, etc.), not full fingerprint

## Event Schema

All events extend a base event structure:

```typescript
interface BaseEvent {
  event: string              // Event type identifier
  timestamp: string          // ISO 8601 timestamp
  claimantId?: string        // Pseudonymized claimant ID (no PII)
  staffId?: string           // Staff identifier (for staff dashboards)
  sessionId?: string         // Session identifier
  userAgent?: string         // Sanitized user agent (browser family only)
}
```

## Tracked Events

### 1. `onboarding_completed`

Tracks when a claimant completes the onboarding flow.

**Fields:**
- `event`: `"onboarding_completed"`
- `totalSteps`: Number of steps completed (typically 4)
- `durationSeconds`: Time taken to complete onboarding (in seconds)
- `autoApplyEnabled`: Whether auto-apply is enabled
- `requireReview`: Whether manual review is required
- `jobTypesCount`: Number of preferred job types selected
- `hasDailyCap`: Whether a daily application cap is set

**Example:**
```typescript
{
  event: "onboarding_completed",
  totalSteps: 4,
  durationSeconds: 180,
  autoApplyEnabled: true,
  requireReview: true,
  jobTypesCount: 3,
  hasDailyCap: true,
  timestamp: "2025-01-15T10:30:00.000Z",
  sessionId: "session_1234567890_abc123"
}
```

**Tracked in:** `OnboardingPage` component

---

### 2. `job_search_performed`

Tracks when a claimant performs a job search.

**Fields:**
- `event`: `"job_search_performed"`
- `platform`: Platform searched (`"indeed"`, `"greenhouse"`, `"lever"`, or `"all"`)
- `easyApplyOnly`: Whether "Easy Apply only" filter is enabled
- `remotePreference`: Remote work preference (`"any"`, `"remote"`, `"hybrid"`, `"onsite"`)
- `radiusKm`: Search radius in kilometers
- `hasSalaryFilter`: Whether a minimum salary filter is set
- `autoApplyEnabled`: Whether auto-apply is enabled for this search
- `resultsCount`: Number of results found (optional, if available)

**Example:**
```typescript
{
  event: "job_search_performed",
  platform: "indeed",
  easyApplyOnly: true,
  remotePreference: "any",
  radiusKm: 25,
  hasSalaryFilter: true,
  autoApplyEnabled: true,
  resultsCount: 42,
  timestamp: "2025-01-15T11:00:00.000Z",
  sessionId: "session_1234567890_abc123"
}
```

**Tracked in:** `JobSearchFilters` component

---

### 3. `application_submitted`

Tracks when applications are submitted (single or batch).

**Fields:**
- `event`: `"application_submitted"`
- `batchSize`: Number of applications in the batch
- `platforms`: Comma-separated list of platforms used (e.g., `"indeed,greenhouse"`)
- `isAutoApply`: Whether any applications were auto-applied
- `requiredReview`: Whether any applications required manual review
- `jobTypesCount`: Number of distinct job types in the batch

**Example:**
```typescript
{
  event: "application_submitted",
  batchSize: 5,
  platforms: "indeed,greenhouse",
  isAutoApply: true,
  requiredReview: false,
  jobTypesCount: 2,
  timestamp: "2025-01-15T12:00:00.000Z",
  sessionId: "session_1234567890_abc123"
}
```

**Tracked in:** `ApplicationBatchConfirmationPage` component

---

### 4. `log_exported`

Tracks when a compliance log is exported or shared.

**Fields:**
- `event`: `"log_exported"`
- `format`: Export format (`"csv"` or `"json"`)
- `hasDateRange`: Whether a date range filter was applied
- `startDate`: Start date if filtered (ISO date string, no time component)
- `endDate`: End date if filtered (ISO date string, no time component)
- `shareMethod`: Share method if shared (`"email"` or `"link"`, optional)

**Example:**
```typescript
{
  event: "log_exported",
  format: "csv",
  hasDateRange: true,
  startDate: "2025-01-01",
  endDate: "2025-01-15",
  shareMethod: "email",
  timestamp: "2025-01-15T13:00:00.000Z",
  sessionId: "session_1234567890_abc123"
}
```

**Tracked in:** `ExportLogDialog` component

---

### 5. `dashboard_viewed`

Tracks when a dashboard page is viewed.

**Fields:**
- `event`: `"dashboard_viewed"`
- `dashboardType`: Type of dashboard (`"claimant"`, `"work_coach"`, or `"dwp"`)
- `timeOnPageSeconds`: Time spent on page in seconds (optional, if available)

**Example:**
```typescript
{
  event: "dashboard_viewed",
  dashboardType: "claimant",
  timestamp: "2025-01-15T09:00:00.000Z",
  sessionId: "session_1234567890_abc123"
}
```

**Tracked in:**
- `ClaimantDashboard` component (dashboardType: `"claimant"`)
- `WorkCoachDashboard` component (dashboardType: `"work_coach"`)
- `DWPDashboard` component (dashboardType: `"dwp"`)

---

## Usage

### Basic Usage in Components

```typescript
import { useAnalytics } from "@/lib/useAnalytics"

function MyComponent() {
  const { track } = useAnalytics()

  const handleAction = async () => {
    await track({
      event: "my_event_type",
      // ... event-specific fields
    })
  }

  return <button onClick={handleAction}>Action</button>
}
```

### With Claimant ID

```typescript
const { track } = useAnalytics({
  claimantId: "pseudonymized_user_123",
})
```

### Automatic Page View Tracking

```typescript
useAnalytics({
  trackPageView: true,
  pageIdentifier: "claimant", // or "work_coach", "dwp"
})
```

### Manual Event Tracking

```typescript
import { trackEvent } from "@/lib/analytics"

await trackEvent({
  event: "custom_event",
  // ... event fields
})
```

## Configuration

### Development Mode

In development, events are automatically logged to the console. This can be controlled via:

```typescript
import { initAnalytics } from "@/lib/analytics"

initAnalytics({
  debug: true, // Enable console logging
})
```

### Production Mode

In production, configure an API endpoint:

```typescript
import { initAnalytics } from "@/lib/analytics"

initAnalytics({
  apiEndpoint: "/api/analytics",
  claimantId: "hashed_claimant_id", // Set when user logs in
})
```

### Updating Configuration

```typescript
import { updateAnalyticsConfig } from "@/lib/analytics"

// Update claimant ID after login
updateAnalyticsConfig({
  claimantId: "new_pseudonymized_id",
})
```

## Backend Integration

To receive analytics events, implement a backend endpoint:

```python
# Example FastAPI endpoint
@app.post("/api/analytics")
async def track_analytics(event: dict):
    # Validate event structure
    # Store in database or send to analytics service
    # Return 200 OK
    pass
```

The endpoint should:
1. Accept POST requests with JSON body containing the event
2. Validate the event structure
3. Store or forward to analytics service
4. Return 200 status code on success

Events fail silently in production if the endpoint is unavailable (to avoid disrupting user experience).

## Testing

### Mocking Analytics in Tests

```typescript
import { initAnalytics } from "@/lib/analytics"
import { NullDispatcher } from "@/lib/analytics" // if exposed

// Disable analytics in tests
initAnalytics({
  debug: false,
  // No API endpoint configured
})
```

Or use a spy/mock to capture events:

```typescript
const mockTrack = jest.fn()
jest.mock("@/lib/analytics", () => ({
  trackEvent: mockTrack,
}))
```

## Privacy Considerations

### What We Track
- Aggregate counts (number of applications, job types, etc.)
- High-level categories (platform, remote preference)
- Metadata (timestamp, session ID)
- Pseudonymized identifiers (never raw PII)

### What We DON'T Track
- Full names or email addresses
- Job descriptions or full job titles (only categories)
- Free text content from forms
- Full user agent strings (only browser family)
- IP addresses or location data beyond what's in the search query

### Compliance

All events are designed to:
- Support compliance auditing requirements
- Enable aggregate behavior analysis
- Respect user privacy by avoiding PII
- Align with DWP data protection policies

## Future Enhancements

Potential future event types:
- `application_reviewed`: When an application is manually reviewed
- `settings_changed`: When claimant preferences are updated
- `error_occurred`: When errors are encountered (for debugging)
- `help_requested`: When help/documentation is accessed

## Questions or Issues

For questions about analytics implementation or to add new event types, please contact the development team or create an issue in the project repository.

