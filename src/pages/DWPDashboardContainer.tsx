/**
 * DWPDashboardContainer
 * 
 * Container component that fetches data from API and passes it to DWPDashboard.
 * Handles loading, error states, and data transformation.
 */

import * as React from "react"
import { DWPDashboard } from "./DWPDashboard"
import { apiGet } from "@/lib/apiClient"
import type { DWPDashboardData, FilterOptions } from "@/types/staff"

interface DWPMetricsResponse {
  metrics: {
    totalClaimants: number
    averageApplicationsPerWeek: number
    sanctionRate: number
    averageDaysToWork?: number | null
    pilotVsControl?: {
      pilot: {
        averageApplications: number
        averageDaysToWork?: number
      }
      control: {
        averageApplications: number
        averageDaysToWork?: number
      }
    } | null
  }
  timeSeries: Array<{
    date: string
    applications: number
    compliantClaimants: number
    nonCompliantClaimants: number
  }>
  region?: string
  jobcentre?: string
  timeWindow: {
    start: string
    end: string
  }
}

export function DWPDashboardContainer() {
  const [data, setData] = React.useState<DWPDashboardData | null>(null)
  const [regions, setRegions] = React.useState<string[]>([])
  const [jobcentres, setJobcentres] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState<FilterOptions>({})

  // Fetch regions
  const fetchRegions = React.useCallback(async () => {
    try {
      const response = await apiGet<string[]>("/api/staff/regions")
      setRegions(response || [])
    } catch (err) {
      // Non-blocking: metrics can still load without regions.
    }
  }, [])

  // Fetch jobcentres
  const fetchJobcentres = React.useCallback(async (region?: string) => {
    try {
      const params = new URLSearchParams()
      if (region) {
        params.append("region", region)
      }
      const queryString = params.toString()
      const endpoint = `/api/staff/jobcentres${queryString ? `?${queryString}` : ""}`
      const response = await apiGet<string[]>(endpoint)
      setJobcentres(response || [])
    } catch (err) {
      // Non-blocking: metrics can still load without jobcentres.
    }
  }, [])

  // Fetch metrics
  const fetchMetrics = React.useCallback(async (filterOptions: FilterOptions = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (filterOptions.region) {
        params.append("region", filterOptions.region)
      }
      if (filterOptions.jobcentre) {
        params.append("jobcentre", filterOptions.jobcentre)
      }
      if (filterOptions.regimeLevel && filterOptions.regimeLevel.length > 0) {
        params.append("regime_level", filterOptions.regimeLevel.join(","))
      }
      if (filterOptions.timeWindow?.start) {
        params.append("start_date", filterOptions.timeWindow.start)
      }
      if (filterOptions.timeWindow?.end) {
        params.append("end_date", filterOptions.timeWindow.end)
      }

      const queryString = params.toString()
      const endpoint = `/api/staff/dwp/metrics${queryString ? `?${queryString}` : ""}`
      const response = await apiGet<DWPMetricsResponse>(endpoint)

      // Transform API response to match expected format
      const transformedData: DWPDashboardData = {
        metrics: {
          totalClaimants: response.metrics.totalClaimants,
          averageApplicationsPerWeek: response.metrics.averageApplicationsPerWeek,
          sanctionRate: response.metrics.sanctionRate,
          averageDaysToWork: response.metrics.averageDaysToWork ?? undefined,
          pilotVsControl: response.metrics.pilotVsControl ?? undefined,
        },
        timeSeries: response.timeSeries.map((point) => ({
          date: point.date,
          applications: point.applications,
          compliantClaimants: point.compliantClaimants,
          nonCompliantClaimants: point.nonCompliantClaimants,
        })),
        region: response.region,
        jobcentre: response.jobcentre,
        timeWindow: response.timeWindow,
      }

      setData(transformedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load
  React.useEffect(() => {
    fetchRegions()
    fetchJobcentres()
    fetchMetrics(filters)
  }, [fetchRegions, fetchJobcentres, fetchMetrics])

  // Update jobcentres when region changes
  React.useEffect(() => {
    if (filters.region) {
      fetchJobcentres(filters.region)
    } else {
      fetchJobcentres()
    }
  }, [filters.region, fetchJobcentres])

  // Handle filter changes
  const handleFiltersChange = React.useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters)
    fetchMetrics(newFilters)
    
    // Update jobcentres if region changed
    if (newFilters.region !== filters.region) {
      if (newFilters.region) {
        fetchJobcentres(newFilters.region)
      } else {
        fetchJobcentres()
      }
    }
  }, [fetchMetrics, fetchJobcentres, filters.region])

  return (
    <DWPDashboard
      data={data || undefined}
      isLoading={isLoading}
      error={error}
      onFiltersChange={handleFiltersChange}
      filters={filters}
      regions={regions}
      jobcentres={jobcentres}
    />
  )
}

