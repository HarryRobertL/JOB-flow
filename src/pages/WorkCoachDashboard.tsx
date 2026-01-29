/**
 * WorkCoachDashboard Page
 * 
 * Main dashboard for work coaches to view and manage their assigned claimants.
 * Features:
 * - List of all assigned claimants with key metrics
 * - Filtering and sorting capabilities
 * - Detail panel for selected claimant with activity log
 * - Export/print functionality for appointments
 */

import * as React from "react"
import { FilterBar, KPICard, ClaimantTable, PageHeader, ErrorState, StatusBadge, EmptyState } from "@/components/shared"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { WorkCoachDashboardData, ClaimantDetail, FilterOptions } from "@/types/staff"
import { Users, FileText, Download, Printer, Calendar } from "lucide-react"
import { useAnalytics } from "@/lib/useAnalytics"
import { useToast } from "@/contexts/ToastContext"

export interface WorkCoachDashboardProps {
  /** Dashboard data */
  data?: WorkCoachDashboardData
  /** Currently selected claimant detail */
  selectedClaimant?: ClaimantDetail | null
  /** Loading state */
  isLoading?: boolean
  /** Error state */
  error?: string | null
  /** Callback when claimant is selected */
  onClaimantSelect?: (claimantId: string) => void
  /** Callback when filters change */
  onFiltersChange?: (filters: FilterOptions) => void
  /** Current filter state */
  filters?: FilterOptions
}

export const WorkCoachDashboard: React.FC<WorkCoachDashboardProps> = ({
  data,
  selectedClaimant,
  isLoading = false,
  error = null,
  onClaimantSelect,
  onFiltersChange,
  filters = {},
}) => {
  const { track } = useAnalytics({
    trackPageView: true,
    pageIdentifier: "work_coach",
  })
  const { showToast } = useToast()

  const [localFilters, setLocalFilters] = React.useState<FilterOptions>(filters)

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setLocalFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const handleClaimantSelect = (claimant: { id: string }) => {
    // If navigateToDetail is true, ClaimantTable handles navigation
    // Otherwise, show in sidebar
    if (!onClaimantSelect) return
    
    onClaimantSelect(claimant.id)
    
    // Track claimant view event
    track({
      event: "coach_claimant_viewed",
      claimantId: claimant.id,
      isDetailView: false, // Sidebar view
    } as any)
  }

  const handleExport = async () => {
    if (!selectedClaimant) return
    
    try {
      // Build query params for export
      const params = new URLSearchParams()
      params.append("claimant_id", selectedClaimant.id)
      params.append("format", "csv")
      
      // Use fetch to download the file
      const baseUrl = import.meta.env.VITE_API_BASE_URL || ""
      const url = `${baseUrl}/api/staff/work-coach/reports/export?${params.toString()}`
      
      const response = await fetch(url, {
        credentials: "include",
        method: "GET",
      })
      
      if (!response.ok) {
        throw new Error("Failed to export report")
      }
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = `compliance_report_${selectedClaimant.id}_${new Date().toISOString().split("T")[0]}.csv`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/i)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      // Create blob and download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
      // Track export event
      track({
        event: "export_report_downloaded",
        format: "csv",
        hasDateRange: false, // Could be enhanced to track if date range was used
        reportType: "compliance",
      } as any)
    } catch (err) {
      showToast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Failed to export report. Please try again.",
        variant: "error",
      })
    }
  }

  const handlePrint = () => {
    if (!selectedClaimant) return
    window.print()
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return timestamp
    }
  }


  // Apply filters to claimants list
  const filteredClaimants = React.useMemo(() => {
    if (!data?.claimants) return []
    let filtered = [...data.claimants]

    // Filter by search name
    if (localFilters.searchName) {
      const searchLower = localFilters.searchName.toLowerCase()
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(searchLower))
    }

    // Filter by status
    if (localFilters.status && localFilters.status.length > 0) {
      filtered = filtered.filter((c) => localFilters.status?.includes(c.complianceStatus))
    }

    // Filter by regime level
    if (localFilters.regimeLevel && localFilters.regimeLevel.length > 0) {
      filtered = filtered.filter((c) => localFilters.regimeLevel?.includes(c.regimeLevel))
    }

    // Filter by region
    if (localFilters.region) {
      filtered = filtered.filter((c) => c.region === localFilters.region)
    }

    // Filter by jobcentre
    if (localFilters.jobcentre) {
      filtered = filtered.filter((c) => c.jobcentre === localFilters.jobcentre)
    }

    // Sort
    const sortBy = localFilters.sortBy || "activity"
    const sortOrder = localFilters.sortOrder || "desc"

    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "activity":
          const dateA = a.lastActivityDate ? new Date(a.lastActivityDate).getTime() : 0
          const dateB = b.lastActivityDate ? new Date(b.lastActivityDate).getTime() : 0
          comparison = dateA - dateB
          break
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "compliance":
          const statusOrder = { on_track: 0, at_risk: 1, non_compliant: 2 }
          comparison = statusOrder[a.complianceStatus] - statusOrder[b.complianceStatus]
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [data?.claimants, localFilters])

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Work Coach Dashboard" />
        <ErrorState
          title="Unable to load dashboard"
          message={error || "An error occurred while loading the dashboard"}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="work-coach-dashboard">
        <PageHeader
          title="Your claimants"
          description="View and manage your assigned claimants. Use filters to find specific cases, review compliance status, and access detailed evidence for appointments. Click on a claimant name to view their full activity log and export reports."
        />

        {/* KPI Cards */}
        <section aria-labelledby="kpi-heading">
          <h2 id="kpi-heading" className="sr-only">Key performance indicators</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
            <div role="listitem">
              <KPICard
                title="Active claimants"
                value={data?.totalClaimants || 0}
                icon={<Users className="h-4 w-4" aria-hidden="true" />}
              />
            </div>
            <div role="listitem">
              <KPICard
                title="On track"
                value={data?.onTrackCount || 0}
                variant="success"
                icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              />
            </div>
            <div role="listitem">
              <KPICard
                title="At risk"
                value={data?.atRiskCount || 0}
                variant="warning"
                icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              />
            </div>
            <div role="listitem">
              <KPICard
                title="Non compliant"
                value={data?.nonCompliantCount || 0}
                variant="error"
                icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              />
            </div>
          </div>
        </section>

        {/* Main Content: Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Panel: Filters and Table (2 columns on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <FilterBar
              filters={localFilters}
              onFiltersChange={handleFiltersChange}
              showRegionFilter={true}
              showJobcentreFilter={true}
              showCohortFilter={true}
              showSearchName={true}
            />

            {/* Claimants Table */}
            {filteredClaimants.length === 0 && !isLoading ? (
              <EmptyState
                title="No claimants found"
                description="Try adjusting your filters or check back later."
              />
            ) : (
              <ClaimantTable
                claimants={filteredClaimants}
                onClaimantSelect={handleClaimantSelect}
                selectedClaimantId={selectedClaimant?.id}
                isLoading={isLoading}
                navigateToDetail={true}
              />
            )}
          </div>

          {/* Right Panel: Claimant Detail (1 column on desktop) */}
          <div className="lg:col-span-1">
            {selectedClaimant ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedClaimant.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {selectedClaimant.jobcentre && `Jobcentre: ${selectedClaimant.jobcentre}`}
                        {selectedClaimant.region && ` • ${selectedClaimant.region}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-text-tertiary">Regime level</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">
                        {selectedClaimant.regimeLevel === "intensive"
                          ? "Intensive"
                          : selectedClaimant.regimeLevel === "standard"
                          ? "Standard"
                          : "Light touch"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Compliance</p>
                      <div className="mt-1">
                        <StatusBadge status={selectedClaimant.complianceStatus} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Applications this week</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">
                        {selectedClaimant.applicationsThisWeek} / {selectedClaimant.requiredApplications}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Last activity</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">
                        {formatDate(selectedClaimant.lastActivityDate)}
                      </p>
                    </div>
                  </div>

                  {/* Next Appointment */}
                  {selectedClaimant.nextAppointment && (
                    <div className="rounded-md bg-info-50 border border-info-200 p-3" role="status" aria-live="polite">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-info-700" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-medium text-info-800">Next appointment</p>
                          <p className="text-xs text-info-700">{formatDate(selectedClaimant.nextAppointment)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={handleExport} 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      aria-label="Export claimant data for appointment"
                      data-testid="export-claimant-button"
                    >
                      <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                      Export for appointment
                    </Button>
                    <Button 
                      onClick={handlePrint} 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      aria-label="Print claimant information"
                      data-testid="print-claimant-button"
                    >
                      <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
                      Print
                    </Button>
                  </div>

                  {/* Activity Log */}
                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Activity log</h3>
                    {selectedClaimant.activityLog && selectedClaimant.activityLog.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Job</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedClaimant.activityLog.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="text-xs text-text-secondary">
                                  {formatTimestamp(entry.timestamp)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div>
                                    <p className="font-medium text-text-primary">{entry.jobTitle}</p>
                                    <p className="text-text-tertiary">{entry.company}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={entry.status === "skip" ? "skip" : entry.status} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-xs text-text-tertiary">No activity logged yet.</p>
                    )}
                  </section>

                  {/* Notes Section */}
                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-2">Notes</h3>
                    {selectedClaimant.notes && selectedClaimant.notes.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-text-secondary">
                          {selectedClaimant.notes.length} note{selectedClaimant.notes.length !== 1 ? "s" : ""}. View full details on the claimant page.
                        </p>
                        <p className="text-xs text-text-tertiary whitespace-pre-wrap line-clamp-2">
                          {selectedClaimant.notes[0].body}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-text-tertiary italic">No notes yet.</p>
                    )}
                  </section>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <p className="text-sm font-medium text-text-primary">Select a claimant</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Click on a claimant from the list to view their details and activity log.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </div>
  )
}

