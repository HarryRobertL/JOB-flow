/**
 * WorkCoachDashboardContainer
 * 
 * Container component that fetches data from API and passes it to WorkCoachDashboard.
 * Handles loading, error states, and data transformation.
 */

import * as React from "react"
import { WorkCoachDashboard } from "./WorkCoachDashboard"
import { apiGet } from "@/lib/apiClient"
import type { WorkCoachDashboardData, ClaimantDetail, ClaimantNote, ComplianceAction, FilterOptions } from "@/types/staff"

interface WorkCoachClaimantsResponse {
  claimants: Array<{
    id: string
    name: string
    regimeLevel: string
    lastActivityDate: string | null
    applicationsThisWeek: number
    complianceStatus: string
    requiredApplications: number
    completedApplications: number
    jobcentre?: string
    region?: string
  }>
  totalClaimants: number
  onTrackCount: number
  atRiskCount: number
  nonCompliantCount: number
}

interface ClaimantDetailResponse {
  id: string
  name: string
  regimeLevel: string
  lastActivityDate: string | null
  applicationsThisWeek: number
  complianceStatus: string
  requiredApplications: number
  completedApplications: number
  jobcentre?: string
  region?: string
  activityLog: Array<{
    id: string
    timestamp: string
    jobTitle: string
    company: string
    status: string
    platform: string
    url?: string
    notes?: string
  }>
  notes?: ClaimantNote[]
  actions?: ComplianceAction[]
  flags?: string[]
}

export function WorkCoachDashboardContainer() {
  const [data, setData] = React.useState<WorkCoachDashboardData | null>(null)
  const [selectedClaimant, setSelectedClaimant] = React.useState<ClaimantDetail | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState<FilterOptions>({})

  // Fetch claimants list
  const fetchClaimants = React.useCallback(async (filterOptions: FilterOptions = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (filterOptions.status && filterOptions.status.length > 0) {
        params.append("status", filterOptions.status.join(","))
      }
      if (filterOptions.regimeLevel && filterOptions.regimeLevel.length > 0) {
        params.append("regime_level", filterOptions.regimeLevel.join(","))
      }
      if (filterOptions.region) {
        params.append("region", filterOptions.region)
      }
      if (filterOptions.jobcentre) {
        params.append("jobcentre", filterOptions.jobcentre)
      }
      if (filterOptions.cohort) {
        params.append("cohort", filterOptions.cohort)
      }
      if (filterOptions.sortBy) {
        params.append("sort_by", filterOptions.sortBy)
      }
      if (filterOptions.sortOrder) {
        params.append("sort_order", filterOptions.sortOrder)
      }

      const queryString = params.toString()
      const endpoint = `/api/staff/work-coach/claimants${queryString ? `?${queryString}` : ""}`
      const response = await apiGet<WorkCoachClaimantsResponse>(endpoint)

      // Transform API response to match expected format
      const transformedData: WorkCoachDashboardData = {
        claimants: response.claimants.map((c) => ({
          id: c.id,
          name: c.name,
          regimeLevel: c.regimeLevel as "intensive" | "standard" | "light_touch",
          lastActivityDate: c.lastActivityDate,
          applicationsThisWeek: c.applicationsThisWeek,
          complianceStatus: c.complianceStatus as "on_track" | "at_risk" | "non_compliant",
          requiredApplications: c.requiredApplications,
          completedApplications: c.completedApplications,
          jobcentre: c.jobcentre,
          region: c.region,
        })),
        totalClaimants: response.totalClaimants,
        onTrackCount: response.onTrackCount,
        atRiskCount: response.atRiskCount,
        nonCompliantCount: response.nonCompliantCount,
      }

      setData(transformedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claimants")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch claimant detail
  const fetchClaimantDetail = React.useCallback(async (claimantId: string) => {
    setIsLoadingDetail(true)
    setError(null)

    try {
      const response = await apiGet<ClaimantDetailResponse>(
        `/api/staff/work-coach/claimants/${claimantId}`
      )

      // Transform API response to match expected format
      const transformedDetail: ClaimantDetail = {
        id: response.id,
        name: response.name,
        regimeLevel: response.regimeLevel as "intensive" | "standard" | "light_touch",
        lastActivityDate: response.lastActivityDate,
        applicationsThisWeek: response.applicationsThisWeek,
        complianceStatus: response.complianceStatus as "on_track" | "at_risk" | "non_compliant",
        requiredApplications: response.requiredApplications,
        completedApplications: response.completedApplications,
        jobcentre: response.jobcentre,
        region: response.region,
        activityLog: response.activityLog.map((entry) => ({
          id: entry.id,
          timestamp: entry.timestamp,
          jobTitle: entry.jobTitle,
          company: entry.company,
          status: (entry.status === "applied" ? "applied" : entry.status === "skip" ? "skip" : "error") as "applied" | "skip" | "error",
          platform: entry.platform,
          url: entry.url,
          notes: entry.notes,
        })),
        notes: response.notes ?? [],
        actions: response.actions ?? [],
        flags: response.flags ?? [],
      }

      setSelectedClaimant(transformedDetail)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claimant details")
      setSelectedClaimant(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  // Initial load
  React.useEffect(() => {
    fetchClaimants(filters)
  }, [fetchClaimants])

  // Handle filter changes
  const handleFiltersChange = React.useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters)
    fetchClaimants(newFilters)
  }, [fetchClaimants])

  // Handle claimant selection
  const handleClaimantSelect = React.useCallback((claimantId: string) => {
    fetchClaimantDetail(claimantId)
  }, [fetchClaimantDetail])

  return (
    <WorkCoachDashboard
      data={data || undefined}
      selectedClaimant={selectedClaimant}
      isLoading={isLoading || isLoadingDetail}
      error={error}
      onClaimantSelect={handleClaimantSelect}
      onFiltersChange={handleFiltersChange}
      filters={filters}
    />
  )
}

