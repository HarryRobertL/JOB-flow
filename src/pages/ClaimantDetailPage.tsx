/**
 * ClaimantDetailPage Component
 * 
 * Detailed view for a single claimant showing:
 * - Profile summary
 * - Compliance summary (this week and past weeks)
 * - Evidence section (applications by platform and status)
 * - Activity log with filters
 * - Notes and flags
 * - Export functionality
 */

import * as React from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { apiGet, apiPost } from "@/lib/apiClient"
import { PageHeader, ErrorState, EmptyState, KPICard, StatusBadge, ActivityDetailModal, type ActivityDetailEntry } from "@/components/shared"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ExportLogDialog } from "@/components/shared/ExportLogDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/contexts/ToastContext"
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Calendar,
  Building2,
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
  MessageSquarePlus,
  AlertTriangle,
  FileEdit
} from "lucide-react"
import type { ClaimantDetail, ClaimantNote, ComplianceAction, ComplianceActionType, ComplianceHistoryEntry } from "@/types/staff"

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
    errorMessage?: string
    artifactUrl?: string | null
  }>
  notes?: ClaimantNote[]
  actions?: ComplianceAction[]
  flags?: string[]
  complianceHistory?: ComplianceHistoryEntry[]
}

export const ClaimantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [claimant, setClaimant] = React.useState<ClaimantDetail | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [newNoteBody, setNewNoteBody] = React.useState("")
  const [isAddingNote, setIsAddingNote] = React.useState(false)
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false)
  const [actionType, setActionType] = React.useState<ComplianceActionType>("warning_issued")
  const [actionComment, setActionComment] = React.useState("")
  const [isSubmittingAction, setIsSubmittingAction] = React.useState(false)
  
  // Activity log filters
  const [dateFrom, setDateFrom] = React.useState<string>("")
  const [dateTo, setDateTo] = React.useState<string>("")
  const [platformFilter, setPlatformFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [selectedActivity, setSelectedActivity] = React.useState<ClaimantDetail["activityLog"][0] | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  // Get current week start/end for default export range
  const getCurrentWeekRange = () => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Sunday
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    return {
      start: weekStart.toISOString().split("T")[0],
      end: weekEnd.toISOString().split("T")[0],
    }
  }

  const fetchClaimantDetail = React.useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiGet<ClaimantDetailResponse>(
        `/api/staff/work-coach/claimants/${id}`
      )

      // Transform API response
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
          errorMessage: (entry as { errorMessage?: string }).errorMessage,
          artifactUrl: (entry as { artifactUrl?: string | null }).artifactUrl,
        })),
        notes: response.notes ?? [],
        actions: response.actions ?? [],
        flags: response.flags ?? [],
        complianceHistory: response.complianceHistory,
      }

      setClaimant(transformedDetail)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claimant details")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  React.useEffect(() => {
    fetchClaimantDetail()
  }, [fetchClaimantDetail])

  // Filter activity log
  const filteredActivityLog = React.useMemo(() => {
    if (!claimant?.activityLog) return []
    
    let filtered = [...claimant.activityLog]

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.timestamp)
        entryDate.setHours(0, 0, 0, 0)
        return entryDate >= fromDate
      })
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.timestamp)
        return entryDate <= toDate
      })
    }

    // Filter by platform
    if (platformFilter !== "all") {
      filtered = filtered.filter((entry) => entry.platform.toLowerCase() === platformFilter.toLowerCase())
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((entry) => entry.status === statusFilter)
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [claimant?.activityLog, dateFrom, dateTo, platformFilter, statusFilter])

  // Calculate evidence stats
  const evidenceStats = React.useMemo(() => {
    if (!claimant?.activityLog) return { byPlatform: {}, byStatus: { applied: 0, skipped: 0, error: 0 } }
    
    const byPlatform: Record<string, number> = {}
    const byStatus = { applied: 0, skipped: 0, error: 0 }

    claimant.activityLog.forEach((entry) => {
      // Count by platform
      const platform = entry.platform || "unknown"
      byPlatform[platform] = (byPlatform[platform] || 0) + 1

      // Count by status
      if (entry.status === "applied") byStatus.applied++
      else if (entry.status === "skip") byStatus.skipped++
      else if (entry.status === "error") byStatus.error++
    })

    return { byPlatform, byStatus }
  }, [claimant?.activityLog])

  // Get unique platforms
  const platforms = React.useMemo(() => {
    if (!claimant?.activityLog) return []
    return Array.from(new Set(claimant.activityLog.map((e) => e.platform).filter(Boolean))).sort()
  }, [claimant?.activityLog])

  const handleExport = async (format: "csv" | "json" | "pdf", dateRange?: { start: string; end: string }) => {
    if (!id) return

    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      params.append("claimant_id", id)
      params.append("format", format)
      
      if (dateRange) {
        params.append("start_date", dateRange.start)
        params.append("end_date", dateRange.end)
      } else {
        // Default to current compliance week
        const weekRange = getCurrentWeekRange()
        params.append("start_date", weekRange.start)
        params.append("end_date", weekRange.end)
      }

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
      let filename = `compliance_report_${id}_${new Date().toISOString().split("T")[0]}.${format}`
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

      showToast({
        title: "Report exported",
        description: `Your compliance report has been downloaded as ${filename}.`,
        variant: "success",
      })

      setIsExportDialogOpen(false)
    } catch (err) {
      showToast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Failed to export report. Please try again.",
        variant: "error",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status: "applied" | "skip" | "error") => {
    switch (status) {
      case "applied":
        return <StatusBadge status="on_track" />
      case "skip":
        return <Badge variant="outline">Skipped</Badge>
      case "error":
        return <StatusBadge status="non_compliant" />
    }
  }

  const openActionDialog = (type: ComplianceActionType) => {
    setActionType(type)
    setActionComment("")
    setActionDialogOpen(true)
  }

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setIsSubmittingAction(true)
    try {
      await apiPost<ComplianceAction>(`/api/staff/work-coach/claimants/${id}/actions`, {
        action_type: actionType,
        comment: actionComment.trim() || undefined,
      })
      setActionDialogOpen(false)
      fetchClaimantDetail()
      showToast({
        title: actionType === "warning_issued" ? "Warning recorded" : "Adjustment recorded",
        variant: "success",
      })
    } catch (err) {
      showToast({
        title: "Failed to record action",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !newNoteBody.trim()) return
    setIsAddingNote(true)
    try {
      await apiPost<ClaimantNote>(`/api/staff/work-coach/claimants/${id}/notes`, { body: newNoteBody.trim() })
      setNewNoteBody("")
      fetchClaimantDetail()
      showToast({ title: "Note added", variant: "success" })
    } catch (err) {
      showToast({
        title: "Failed to add note",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsAddingNote(false)
    }
  }

  const getRegimeLabel = (regime: string) => {
    switch (regime) {
      case "intensive":
        return "Intensive"
      case "standard":
        return "Standard"
      case "light_touch":
        return "Light touch"
      default:
        return regime
    }
  }

  // Navigate back with preserved filters
  const handleBack = () => {
    // Try to get filters from location state, or use empty
    const filters = location.state?.filters || ""
    navigate(`/staff/work-coach${filters ? filters : ""}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Claimant details" />
        <div className="space-y-4">
          <div className="h-32 bg-neutral-100 rounded-lg animate-pulse" />
          <div className="h-64 bg-neutral-100 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !claimant) {
    return (
      <div className="space-y-6">
        <PageHeader title="Claimant details" />
        <ErrorState
          title="Unable to load claimant details"
          message={error || "Claimant not found"}
          onRetry={fetchClaimantDetail}
        />
      </div>
    )
  }

  const weekRange = getCurrentWeekRange()

  return (
    <div className="space-y-6" data-testid="claimant-detail-page">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to claimants
        </Button>
      </div>

      <PageHeader
        title={claimant.name}
        description={`View compliance evidence, activity log, and export reports for appointments. Default export range is the current compliance week (${weekRange.start} to ${weekRange.end}).`}
        actions={
          <Button
            variant="outline"
            onClick={() => setIsExportDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export report
          </Button>
        }
      />

      {/* Flags */}
      {claimant.flags && claimant.flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {claimant.flags.map((flag, i) => (
            <Badge key={i} variant="warning" className="bg-amber-100 text-amber-900 border-amber-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              {flag}
            </Badge>
          ))}
        </div>
      )}

      {/* Profile Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Profile summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-text-secondary">Jobcentre</p>
                <p className="text-sm font-medium text-text-primary">{claimant.jobcentre || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-text-secondary">Region</p>
                <p className="text-sm font-medium text-text-primary">{claimant.region || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-text-secondary">Regime level</p>
                <p className="text-sm font-medium text-text-primary">{getRegimeLabel(claimant.regimeLevel)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-xs text-text-secondary">Last activity</p>
                <p className="text-sm font-medium text-text-primary">
                  {formatDate(claimant.lastActivityDate)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* This Week */}
        <Card>
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardDescription>Current compliance period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Applications</span>
              <span className="text-lg font-semibold text-text-primary">
                {claimant.applicationsThisWeek} / {claimant.requiredApplications}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Status</span>
              <StatusBadge status={claimant.complianceStatus} />
            </div>
            {claimant.applicationsThisWeek < claimant.requiredApplications && (
              <div className="rounded-md bg-warning-50 border border-warning-200 p-3">
                <p className="text-sm text-warning-800">
                  <strong>{claimant.requiredApplications - claimant.applicationsThisWeek} more applications</strong> needed to meet this week's requirement.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evidence Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Evidence summary</CardTitle>
            <CardDescription>Applications by platform and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* By Status */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">By status</p>
              <div className="grid grid-cols-3 gap-2">
                <KPICard
                  title="Applied"
                  value={evidenceStats.byStatus.applied}
                  variant="success"
                  icon={<CheckCircle className="h-3 w-3" />}
                />
                <KPICard
                  title="Skipped"
                  value={evidenceStats.byStatus.skipped}
                  variant="warning"
                  icon={<AlertCircle className="h-3 w-3" />}
                />
                <KPICard
                  title="Errors"
                  value={evidenceStats.byStatus.error}
                  variant="error"
                  icon={<XCircle className="h-3 w-3" />}
                />
              </div>
            </div>

            {/* By Platform */}
            {Object.keys(evidenceStats.byPlatform).length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">By platform</p>
                <div className="space-y-2">
                  {Object.entries(evidenceStats.byPlatform)
                    .sort(([, a], [, b]) => b - a)
                    .map(([platform, count]) => (
                      <div key={platform} className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{platform}</span>
                        <span className="font-medium text-text-primary">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance History */}
      {claimant.complianceHistory && claimant.complianceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance history</CardTitle>
            <CardDescription>Past weeks' compliance performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {claimant.complianceHistory.map((week, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-md border border-neutral-200 bg-white"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {new Date(week.weekStart).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      -{" "}
                      {new Date(week.weekEnd).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {week.applicationsThisWeek} / {week.requiredApplications} applications
                    </p>
                  </div>
                  <div className="ml-4">
                    {week.isCompliant ? (
                      <StatusBadge status="on_track" />
                    ) : (
                      <StatusBadge status="non_compliant" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
          <CardDescription>All job search and application activity</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-500" />
              <Label className="text-sm font-medium">Filter activity</Label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="date-from" className="text-xs">From date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="date-to" className="text-xs">To date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 mt-1"
                />
              </div>
              {platforms.length > 0 && (
                <div>
                  <Label htmlFor="platform-filter" className="text-xs">Platform</Label>
                  <Select
                    id="platform-filter"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="h-9 mt-1"
                  >
                    <option value="all">All platforms</option>
                    {platforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="status-filter" className="text-xs">Status</Label>
                <Select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 mt-1"
                >
                  <option value="all">All statuses</option>
                  <option value="applied">Applied</option>
                  <option value="skip">Skipped</option>
                  <option value="error">Error</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredActivityLog.length === 0 ? (
            <EmptyState
              title="No activity found"
              description="No activity matches your filters. Try adjusting your filter criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivityLog.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() => {
                        setSelectedActivity(entry)
                        setDetailOpen(true)
                      }}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setSelectedActivity(entry)
                          setDetailOpen(true)
                        }
                      }}
                    >
                      <TableCell className="text-sm text-text-secondary">
                        {formatDate(entry.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm text-text-primary">{entry.jobTitle}</p>
                          {entry.url && (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View job
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {entry.company}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {entry.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Internal notes for this claimant. Add notes to record appointments or follow-ups.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddNote} className="space-y-2">
            <Label htmlFor="new-note">Add note</Label>
            <textarea
              id="new-note"
              value={newNoteBody}
              onChange={(e) => setNewNoteBody(e.target.value)}
              placeholder="Record a note for this claimant…"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
              disabled={isAddingNote}
            />
            <Button type="submit" size="sm" disabled={!newNoteBody.trim() || isAddingNote}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              {isAddingNote ? "Adding…" : "Add note"}
            </Button>
          </form>
          {claimant.notes && claimant.notes.length > 0 ? (
            <div className="space-y-3 pt-2 border-t border-border-default">
              <p className="text-xs font-medium text-text-secondary">Recent notes</p>
              <ul className="space-y-3">
                {claimant.notes.map((note) => (
                  <li key={note.id} className="rounded-md border border-border-default bg-surface-subtle p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary">{note.author_email}</span>
                      <span className="text-xs text-text-tertiary">{formatDate(note.created_at)}</span>
                    </div>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{note.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-text-tertiary italic pt-2">No notes yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Compliance Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance actions</CardTitle>
          <CardDescription>Record warnings or requirement adjustments for this claimant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openActionDialog("warning_issued")}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Issue warning
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => openActionDialog("requirement_adjusted")}>
              <FileEdit className="h-4 w-4 mr-2" />
              Log adjustment
            </Button>
          </div>
          {claimant.actions && claimant.actions.length > 0 ? (
            <div className="space-y-2 pt-2 border-t border-border-default">
              <p className="text-xs font-medium text-text-secondary">Action history</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Coach</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claimant.actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                        {formatDate(action.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={action.action_type === "warning_issued" ? "warning" : "outline"}>
                          {action.action_type === "warning_issued" ? "Warning" : "Adjustment"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">{action.coach_email}</TableCell>
                      <TableCell className="text-sm text-text-secondary max-w-[200px] truncate">
                        {action.payload?.comment ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-text-tertiary italic pt-2">No compliance actions recorded yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Action dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "warning_issued" ? "Issue warning" : "Log adjustment"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAction} className="space-y-4">
            <div>
              <Label htmlFor="action-comment">Comment (optional)</Label>
              <Textarea
                id="action-comment"
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Add context for this action…"
                rows={3}
                className="mt-1"
                disabled={isSubmittingAction}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActionDialogOpen(false)} disabled={isSubmittingAction}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingAction}>
                {isSubmittingAction ? "Recording…" : actionType === "warning_issued" ? "Record warning" : "Record adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <ExportLogDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Activity detail modal */}
      <ActivityDetailModal
        activity={selectedActivity ? toDetailEntry(selectedActivity) : null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}

function toDetailEntry(
  entry: ClaimantDetail["activityLog"][number] & { errorMessage?: string; artifactUrl?: string | null }
): ActivityDetailEntry {
  return {
    id: entry.id,
    jobTitle: entry.jobTitle,
    company: entry.company,
    status: entry.status,
    submittedAt: entry.timestamp,
    platform: entry.platform,
    url: entry.url,
    notes: entry.notes,
    errorMessage: entry.errorMessage,
    artifactUrl: entry.artifactUrl,
  }
}
