/**
 * DWPDashboard Page
 * 
 * Regional or central DWP dashboard for aggregated metrics and reporting.
 * Features:
 * - High-level KPI cards
 * - Time series chart (layout prepared for charting library)
 * - Regional and jobcentre filters
 * - Pilot vs control comparison if available
 */

import * as React from "react"
import { FilterBar, KPICard, PageHeader, ErrorState, EmptyState } from "@/components/shared"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { DWPDashboardData, FilterOptions } from "@/types/staff"
import { TrendingUp, Users, FileText, AlertCircle, BarChart3 } from "lucide-react"
import { useAnalytics } from "@/lib/useAnalytics"

export interface DWPDashboardProps {
  /** Dashboard data */
  data?: DWPDashboardData
  /** Loading state */
  isLoading?: boolean
  /** Error state */
  error?: string | null
  /** Callback when filters change */
  onFiltersChange?: (filters: FilterOptions) => void
  /** Current filter state */
  filters?: FilterOptions
  /** Available regions */
  regions?: string[]
  /** Available jobcentres */
  jobcentres?: string[]
}

export const DWPDashboard: React.FC<DWPDashboardProps> = ({
  data,
  isLoading = false,
  error = null,
  onFiltersChange,
  filters = {},
  regions = [],
  jobcentres = [],
}) => {
  useAnalytics({
    trackPageView: true,
    pageIdentifier: "dwp",
  })

  const [localFilters, setLocalFilters] = React.useState<FilterOptions>(filters)

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setLocalFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  // Calculate chart data for time series
  const chartData = React.useMemo(() => {
    if (!data?.timeSeries || data.timeSeries.length === 0) {
      // Return stub data for empty state
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          date: date.toISOString().split("T")[0],
          applications: 0,
          compliantClaimants: 0,
          nonCompliantClaimants: 0,
        }
      })
    }
    return data.timeSeries
  }, [data?.timeSeries])

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="DWP Regional Dashboard" />
        <ErrorState
          title="Unable to load dashboard"
          message={error || "An error occurred while loading the dashboard"}
        />
      </div>
    )
  }

  const metrics = data?.metrics

  return (
    <div className="space-y-6">
        <PageHeader
          title="JobFlow Pilot Dashboard"
          description="Executive overview of pilot performance and key outcomes"
        />

        {/* Pilot Summary Card */}
        <Card className="bg-primary-50 border-primary-200">
          <CardHeader>
            <CardTitle className="text-lg">Pilot at a glance</CardTitle>
            <CardDescription>Overview of the JobFlow pilot programme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Cohort size</p>
                <p className="text-lg font-semibold text-text-primary">
                  {metrics?.totalClaimants || 0} claimants
                </p>
                <p className="text-xs text-text-tertiary mt-1">Active participants in pilot</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Time frame</p>
                <p className="text-lg font-semibold text-text-primary">
                  {data?.timeWindow ? (
                    <>
                      {new Date(data.timeWindow.start).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      -{" "}
                      {new Date(data.timeWindow.end).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  ) : (
                    "Ongoing"
                  )}
                </p>
                <p className="text-xs text-text-tertiary mt-1">Current reporting period</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1">Key aims</p>
                <ul className="text-xs text-text-secondary space-y-1 mt-1">
                  <li>• Reduce administrative time for work coaches</li>
                  <li>• Lower sanction rates through better compliance</li>
                  <li>• Increase job applications per claimant</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <FilterBar
          filters={localFilters}
          onFiltersChange={handleFiltersChange}
          showRegionFilter={true}
          showJobcentreFilter={true}
          showTimeWindow={true}
          regions={regions}
          jobcentres={jobcentres}
          availableRegimes={["intensive", "standard", "light_touch"]}
        />

        {/* KPI Cards */}
        {!data && !isLoading ? (
          <EmptyState
            title="No data available"
            description="Dashboard metrics will appear here once data is available."
          />
        ) : (
          <section aria-labelledby="kpi-heading">
            <h2 id="kpi-heading" className="sr-only">Key performance indicators</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
              <div role="listitem">
                <KPICard
                  title="Total claimants in pilot"
                  value={metrics?.totalClaimants || 0}
                  description="Number of active participants using JobFlow"
                  icon={<Users className="h-4 w-4" aria-hidden="true" />}
                />
              </div>
              <div role="listitem">
                <KPICard
                  title="Average applications per week"
                  value={metrics?.averageApplicationsPerWeek?.toFixed(1) || "0.0"}
                  description="Mean number of job applications submitted per claimant each week"
                  icon={<FileText className="h-4 w-4" aria-hidden="true" />}
                  variant="success"
                />
              </div>
              <div role="listitem">
                <KPICard
                  title="Sanction rate"
                  value={`${((metrics?.sanctionRate || 0) * 100).toFixed(1)}%`}
                  description="Percentage of claimants who did not meet job search requirements"
                  icon={<AlertCircle className="h-4 w-4" aria-hidden="true" />}
                  variant={metrics && metrics.sanctionRate > 0.1 ? "error" : "warning"}
                />
              </div>
              {metrics?.averageDaysToWork !== undefined ? (
                <div role="listitem">
                  <KPICard
                    title="Average days to work"
                    value={metrics.averageDaysToWork.toFixed(0)}
                    description="Mean time from claim start to employment"
                    icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
                    variant="info"
                  />
                </div>
              ) : (
                <div role="listitem">
                  <KPICard
                    title="Time to work"
                    value="—"
                    description="Data not yet available for this metric"
                    icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
                    variant="default"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Pilot vs Control Comparison */}
        {metrics?.pilotVsControl && (
          <Card>
            <CardHeader>
              <CardTitle>Pilot vs control comparison</CardTitle>
              <CardDescription>
                Performance comparison between JobFlow pilot group and standard process control group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4 p-4 rounded-lg bg-primary-50 border border-primary-200">
                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-1">Pilot group</p>
                    <p className="text-xs text-text-secondary">Claimants using JobFlow</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="text-xs text-text-tertiary mb-1">Average applications per week</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {metrics.pilotVsControl.pilot.averageApplications.toFixed(1)}
                      </p>
                    </div>
                    {metrics.pilotVsControl.pilot.averageDaysToWork !== undefined && (
                      <div>
                        <p className="text-xs text-text-tertiary mb-1">Average days to work</p>
                        <p className="text-2xl font-bold text-text-primary">
                          {metrics.pilotVsControl.pilot.averageDaysToWork.toFixed(0)} days
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-1">Control group</p>
                    <p className="text-xs text-text-secondary">Standard job search process</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="text-xs text-text-tertiary mb-1">Average applications per week</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {metrics.pilotVsControl.control.averageApplications.toFixed(1)}
                      </p>
                    </div>
                    {metrics.pilotVsControl.control.averageDaysToWork !== undefined && (
                      <div>
                        <p className="text-xs text-text-tertiary mb-1">Average days to work</p>
                        <p className="text-2xl font-bold text-text-primary">
                          {metrics.pilotVsControl.control.averageDaysToWork.toFixed(0)} days
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Applications over time</CardTitle>
            <CardDescription>
              Weekly trends showing total applications submitted by pilot participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-sm text-text-secondary">Loading chart data...</div>
              </div>
            ) : chartData.length === 0 || chartData.every((d) => d.applications === 0) ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <BarChart3 className="h-12 w-12 text-neutral-300 mb-2" aria-hidden="true" />
                <p className="text-sm font-medium text-text-primary">No data available</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Chart will appear here when application data is available.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Chart */}
                <div
                  className="h-64 flex items-end justify-between gap-1 pb-4 border-b border-neutral-200"
                  role="img"
                  aria-label="Weekly applications chart"
                >
                  {chartData.map((point, index) => {
                    const maxValue = Math.max(...chartData.map((d) => d.applications), 1)
                    const heightPercent = maxValue > 0 ? (point.applications / maxValue) * 100 : 0
                    const date = new Date(point.date)
                    const weekLabel = date.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center group"
                        role="group"
                        aria-label={`Week of ${weekLabel}: ${point.applications} applications`}
                      >
                        <div
                          className="w-full bg-primary-500 hover:bg-primary-600 transition-colors rounded-t flex items-end justify-center min-h-[4px]"
                          style={{ height: `${Math.max(heightPercent, 2)}%` }}
                          title={`${weekLabel}: ${point.applications} applications`}
                        >
                          <span className="sr-only">
                            Week of {weekLabel}: {point.applications} applications
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-text-tertiary transform -rotate-45 origin-top-left whitespace-nowrap">
                          {weekLabel}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary-500 rounded" aria-hidden="true" />
                    <span className="text-text-secondary">Total applications per week</span>
                  </div>
                </div>

                {/* Summary stats */}
                {chartData.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200">
                    <div>
                      <p className="text-xs text-text-tertiary">Highest week</p>
                      <p className="text-lg font-semibold text-text-primary">
                        {Math.max(...chartData.map((d) => d.applications))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Average per week</p>
                      <p className="text-lg font-semibold text-text-primary">
                        {(
                          chartData.reduce((sum, d) => sum + d.applications, 0) / chartData.length
                        ).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Total shown</p>
                      <p className="text-lg font-semibold text-text-primary">
                        {chartData.reduce((sum, d) => sum + d.applications, 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Summary Table */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly summary</CardTitle>
              <CardDescription>Recent weekly breakdown of applications and compliance status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table" aria-label="Weekly application summary">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium text-text-secondary" scope="col">
                        Week
                      </th>
                      <th className="text-right py-2 px-4 font-medium text-text-secondary" scope="col">
                        Total applications
                      </th>
                      <th className="text-right py-2 px-4 font-medium text-text-secondary" scope="col">
                        Compliant claimants
                      </th>
                      <th className="text-right py-2 px-4 font-medium text-text-secondary" scope="col">
                        Non-compliant claimants
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.slice(-7).reverse().map((point, index) => {
                      const date = new Date(point.date)
                      const weekLabel = `Week of ${date.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}`
                      return (
                        <tr key={index} className="border-b last:border-0 hover:bg-neutral-50">
                          <td className="py-2 px-4 text-text-primary">{weekLabel}</td>
                          <td className="py-2 px-4 text-right text-text-primary font-medium">
                            {point.applications}
                          </td>
                          <td className="py-2 px-4 text-right text-success-700 font-medium">
                            {point.compliantClaimants}
                          </td>
                          <td className="py-2 px-4 text-right text-error-700 font-medium">
                            {point.nonCompliantClaimants}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}

