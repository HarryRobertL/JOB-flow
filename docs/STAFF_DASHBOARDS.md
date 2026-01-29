# Staff Dashboards Documentation

## Overview

The AutoApplyer staff-side dashboards provide work coaches and DWP administrators with tools to monitor, triage, and report on claimant job search activity. These dashboards are designed to support the key outcomes:

- Reduced work coach admin time
- Fewer non-compliance cases
- More verified applications per claimant
- Faster exit from Universal Credit

## Architecture

### Frontend Components

#### Shared Components (`src/components/shared/`)

- **FilterBar**: Reusable filter component with status, regime level, region, jobcentre, and time window filters
- **KPICard**: Key performance indicator cards with trend indicators
- **ClaimantTable**: Accessible table component for displaying claimant lists with sorting and selection

#### Pages (`src/pages/`)

- **WorkCoachDashboard**: Individual work coach view for managing assigned claimants
- **DWPDashboard**: Regional/central DWP view for aggregated metrics and reporting

### Backend API Endpoints

All endpoints are prefixed with `/api/staff/`:

- `GET /api/staff/work-coach/claimants` - List of claimants with filters
- `GET /api/staff/work-coach/claimants/{claimant_id}` - Detailed claimant information with activity log
- `GET /api/staff/dwp/metrics` - Aggregated regional metrics and time series data
- `GET /api/staff/regions` - List of available regions
- `GET /api/staff/jobcentres` - List of available jobcentres (optionally filtered by region)

## Work Coach Dashboard

### Features

1. **Claimant List**
   - Displays all claimants assigned to the work coach
   - Key columns: name, regime level, last activity, applications this week, compliance status
   - Sortable by activity, name, or compliance status
   - Clickable rows to view details

2. **Filtering**
   - Compliance status (On track, At risk, Non compliant)
   - Regime level (Intensive, Standard, Light touch)
   - Region and jobcentre filters
   - Sort options

3. **Claimant Detail Panel**
   - Quick stats (regime level, compliance, applications, last activity)
   - Next appointment information
   - Full activity log with timestamps
   - Export and print buttons for appointment use
   - Notes section

4. **KPI Cards**
   - Total claimants
   - On track count
   - At risk count
   - Non compliant count

### Usage Example

```tsx
import { WorkCoachDashboard } from "@/pages/WorkCoachDashboard"

function App() {
  const [filters, setFilters] = useState({})
  const [selectedClaimantId, setSelectedClaimantId] = useState(null)
  
  // Fetch data from API
  const { data, isLoading } = useQuery({
    queryKey: ['workCoachClaimants', filters],
    queryFn: () => fetch(`/api/staff/work-coach/claimants?${new URLSearchParams(filters)}`).then(r => r.json())
  })
  
  return (
    <WorkCoachDashboard
      data={data}
      isLoading={isLoading}
      filters={filters}
      onFiltersChange={setFilters}
      selectedClaimantId={selectedClaimantId}
      onClaimantSelect={setSelectedClaimantId}
    />
  )
}
```

## DWP Regional Dashboard

### Features

1. **KPI Cards**
   - Total claimants
   - Average applications per week
   - Sanction rate (non-compliance rate)
   - Average days to work (if available)

2. **Pilot vs Control Comparison**
   - Side-by-side comparison of pilot and control groups
   - Average applications per week
   - Average days to work

3. **Time Series Chart**
   - Layout prepared for charting library integration
   - Currently shows placeholder with data structure
   - To integrate: install `recharts` and wire to `timeSeries` data

4. **Filters**
   - Region filter
   - Jobcentre filter
   - Time window (start/end dates)

5. **Weekly Summary Table**
   - Recent weekly application data
   - Compliant vs non-compliant claimant counts

### Usage Example

```tsx
import { DWPDashboard } from "@/pages/DWPDashboard"

function App() {
  const [filters, setFilters] = useState({})
  
  // Fetch data from API
  const { data, isLoading } = useQuery({
    queryKey: ['dwpMetrics', filters],
    queryFn: () => fetch(`/api/staff/dwp/metrics?${new URLSearchParams(filters)}`).then(r => r.json())
  })
  
  return (
    <DWPDashboard
      data={data}
      isLoading={isLoading}
      filters={filters}
      onFiltersChange={setFilters}
      regions={['Wales', 'England', 'Scotland']}
      jobcentres={['Cardiff', 'Swansea', 'Newport']}
    />
  )
}
```

## Data Models

### TypeScript Types

All types are defined in `src/types/staff.ts`:

- `Claimant`: Basic claimant information
- `ClaimantDetail`: Extended claimant information with activity log
- `WorkCoachDashboardData`: Dashboard data structure
- `DWPDashboardData`: Regional dashboard data structure
- `FilterOptions`: Filter state structure
- `ComplianceStatus`: "on_track" | "at_risk" | "non_compliant"
- `RegimeLevel`: "intensive" | "standard" | "light_touch"

## Visual Consistency

The staff dashboards use the same design system as the claimant app:

- **Colors**: Primary blue, semantic colors (success, warning, error, info)
- **Typography**: System fonts with consistent sizing
- **Spacing**: 4px base unit scale
- **Components**: shadcn/ui compatible components (Card, Button, Badge, Table, Input)
- **Accessibility**: WCAG AA compliant, keyboard navigation, focus states

## Integration with Charting Library

The DWP dashboard includes a placeholder for time series charts. To add charting:

1. Install a charting library (e.g., `recharts`):
   ```bash
   npm install recharts
   ```

2. Update `DWPDashboard.tsx` to import and use the chart:
   ```tsx
   import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
   
   // Replace the placeholder div with:
   <LineChart width={600} height={300} data={chartData}>
     <CartesianGrid strokeDasharray="3 3" />
     <XAxis dataKey="date" />
     <YAxis />
     <Tooltip />
     <Legend />
     <Line type="monotone" dataKey="applications" stroke="#0d8aff" />
     <Line type="monotone" dataKey="compliantClaimants" stroke="#22c55e" />
     <Line type="monotone" dataKey="nonCompliantClaimants" stroke="#ef4444" />
   </LineChart>
   ```

## API Response Examples

### Work Coach Claimants

```json
{
  "claimants": [
    {
      "id": "claimant-1",
      "name": "John Smith",
      "regimeLevel": "standard",
      "lastActivityDate": "2024-01-15T10:30:00Z",
      "applicationsThisWeek": 7,
      "complianceStatus": "at_risk",
      "requiredApplications": 10,
      "completedApplications": 7,
      "jobcentre": "Cardiff",
      "region": "Wales"
    }
  ],
  "totalClaimants": 1,
  "onTrackCount": 0,
  "atRiskCount": 1,
  "nonCompliantCount": 0
}
```

### Claimant Detail

```json
{
  "id": "claimant-1",
  "name": "John Smith",
  "regimeLevel": "standard",
  "lastActivityDate": "2024-01-15T10:30:00Z",
  "applicationsThisWeek": 7,
  "complianceStatus": "at_risk",
  "requiredApplications": 10,
  "completedApplications": 7,
  "jobcentre": "Cardiff",
  "region": "Wales",
  "activityLog": [
    {
      "id": "activity-1",
      "timestamp": "2024-01-15T10:30:00Z",
      "jobTitle": "Customer Service Advisor",
      "company": "Retail Solutions Ltd",
      "status": "applied",
      "platform": "indeed",
      "url": "https://example.com/job/1"
    }
  ],
  "notes": null
}
```

### DWP Metrics

```json
{
  "metrics": {
    "totalClaimants": 1,
    "averageApplicationsPerWeek": 7.5,
    "sanctionRate": 0.05,
    "averageDaysToWork": null,
    "pilotVsControl": null
  },
  "timeSeries": [
    {
      "date": "2024-01-08",
      "applications": 8,
      "compliantClaimants": 1,
      "nonCompliantClaimants": 0
    }
  ],
  "region": null,
  "jobcentre": null,
  "timeWindow": {
    "start": "2024-01-01T00:00:00",
    "end": "2024-01-31T23:59:59"
  }
}
```

## Future Enhancements

1. **Database Integration**: Replace CSV-based data with proper database queries
2. **Authentication**: Add role-based access control for work coaches vs DWP admins
3. **Real-time Updates**: WebSocket or polling for live data updates
4. **Export Functionality**: CSV/PDF export for reports
5. **Notes Management**: Allow work coaches to add/edit notes for claimants
6. **Bulk Actions**: Select multiple claimants for batch operations
7. **Advanced Analytics**: More detailed charts and trend analysis

## Notes

- The current implementation uses `data/logs.csv` as the data source
- In a production environment, this would connect to a proper database
- The pilot assumes a single claimant per installation; the API structure supports multiple claimants
- All timestamps are in ISO 8601 format (UTC)

