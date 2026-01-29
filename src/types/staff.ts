/**
 * Staff Dashboard Types
 * 
 * TypeScript interfaces for staff-side dashboards (work coach and DWP regional views).
 */

export type ComplianceStatus = "on_track" | "at_risk" | "non_compliant"

export type RegimeLevel = "intensive" | "standard" | "light_touch"

export type CohortType = "pilot" | "control"

export interface Claimant {
  id: string
  name: string
  regimeLevel: RegimeLevel
  lastActivityDate: string | null
  applicationsThisWeek: number
  complianceStatus: ComplianceStatus
  requiredApplications: number
  completedApplications: number
  nextAppointment?: string | null
  jobcentre?: string
  region?: string
  cohort?: CohortType | null
}

export interface ActivityLogEntry {
  id: string
  timestamp: string
  jobTitle: string
  company: string
  status: "applied" | "skip" | "error"
  platform: string
  url?: string
  notes?: string
}

export interface ComplianceHistoryEntry {
  weekStart: string
  weekEnd: string
  applicationsThisWeek: number
  requiredApplications: number
  isCompliant: boolean
}

export interface ClaimantNote {
  id: string
  author_id: string
  author_email: string
  created_at: string
  body: string
}

export type ComplianceActionType = "warning_issued" | "requirement_adjusted"

export interface ComplianceAction {
  id: string
  claimant_id: string
  coach_id: string
  coach_email: string
  action_type: ComplianceActionType
  payload: { comment?: string }
  created_at: string
}

export interface ClaimantDetail extends Claimant {
  activityLog: ActivityLogEntry[]
  /** List of coach notes (persisted). */
  notes?: ClaimantNote[]
  /** Compliance actions (warnings, adjustments). */
  actions?: ComplianceAction[]
  /** Computed risk/compliance flags. */
  flags?: string[]
  complianceHistory?: ComplianceHistoryEntry[]
}

export interface WorkCoachDashboardData {
  claimants: Claimant[]
  totalClaimants: number
  onTrackCount: number
  atRiskCount: number
  nonCompliantCount: number
}

export interface RegionalMetrics {
  totalClaimants: number
  averageApplicationsPerWeek: number
  sanctionRate: number
  averageDaysToWork?: number
  pilotVsControl?: {
    pilot: {
      averageApplications: number
      averageDaysToWork?: number
    }
    control: {
      averageApplications: number
      averageDaysToWork?: number
    }
  }
}

export interface TimeSeriesDataPoint {
  date: string
  applications: number
  compliantClaimants: number
  nonCompliantClaimants: number
}

export interface DWPDashboardData {
  metrics: RegionalMetrics
  timeSeries: TimeSeriesDataPoint[]
  region?: string
  jobcentre?: string
  timeWindow: {
    start: string
    end: string
  }
}

export interface FilterOptions {
  searchName?: string
  status?: ComplianceStatus[]
  regimeLevel?: RegimeLevel[]
  region?: string
  jobcentre?: string
  cohort?: CohortType
  timeWindow?: {
    start: string
    end: string
  }
  sortBy?: "activity" | "name" | "compliance"
  sortOrder?: "asc" | "desc"
}

