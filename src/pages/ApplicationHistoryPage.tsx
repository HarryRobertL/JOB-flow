/**
 * ApplicationHistoryPage Component
 * 
 * Full application history page showing all submitted applications
 * with filtering and status tracking.
 */

import * as React from "react"
import { apiGet } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { PageHeader, ErrorState, EmptyState, ActivityDetailModal, type ActivityDetailEntry } from "@/components/shared"
import { CheckCircle2, XCircle, Clock, ExternalLink, Download } from "lucide-react"

interface ActivityEntry {
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
}

interface StatusResponse {
  stats: {
    total: number
    applied: number
    skip: number
    error: number
    last_run?: string
  }
  activity: ActivityEntry[]
}

export const ApplicationHistoryPage: React.FC = () => {
  const [activities, setActivities] = React.useState<ActivityEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [platformFilter, setPlatformFilter] = React.useState<string>("all")
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityEntry | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  React.useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiGet<StatusResponse>("/api/claimant/status")
      setActivities(response.activity || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load application history")
      setActivities([])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === "applied" || statusLower === "submitted") {
      return (
        <Badge variant="outline" className="bg-success-50 text-success-700 border-success-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Applied
        </Badge>
      )
    }
    if (statusLower === "error" || statusLower === "failed") {
      return (
        <Badge variant="outline" className="bg-error-50 text-error-700 border-error-200">
          <XCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      )
    }
    if (statusLower === "skip" || statusLower === "skipped") {
      return (
        <Badge variant="outline" className="bg-neutral-50 text-neutral-700">
          <XCircle className="h-3 w-3 mr-1" />
          Skipped
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-primary-50 text-primary-700">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    )
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const filteredActivities = React.useMemo(() => {
    return activities.filter((activity) => {
      if (statusFilter !== "all" && activity.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }
      if (platformFilter !== "all" && activity.platform.toLowerCase() !== platformFilter.toLowerCase()) {
        return false
      }
      return true
    })
  }, [activities, statusFilter, platformFilter])

  const handleExport = () => {
    // For now, trigger window.print() for print-friendly view
    // In future, could add CSV export endpoint
    window.print()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Application History"
          description="Loading your application history..."
        />
        <div className="space-y-4">
          <div className="h-32 bg-neutral-100 rounded-lg animate-pulse" />
          <div className="h-64 bg-neutral-100 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Application History" />
        <ErrorState
          title="Unable to load application history"
          message={error}
          onRetry={fetchActivities}
        />
      </div>
    )
  }

  const uniquePlatforms = Array.from(new Set(activities.map((a) => a.platform))).sort()

  return (
    <div className="space-y-6" data-testid="application-history-page">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Application history"
          description="View all your job applications and their status. This log shows all applications submitted through JobFlow and can be shared with your work coach as evidence of your job search activity."
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Print/Export
          </Button>
        </div>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Applications will appear here once you start applying to jobs."
        />
      ) : (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium text-text-secondary mb-2">
                    Filter by status
                  </label>
                  <Select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="applied">Applied</option>
                    <option value="pending">Pending</option>
                    <option value="skip">Skipped</option>
                    <option value="error">Error</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="platform-filter" className="block text-sm font-medium text-text-secondary mb-2">
                    Filter by platform
                  </label>
                  <Select
                    id="platform-filter"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                  >
                    <option value="all">All platforms</option>
                    {uniquePlatforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardDescription>
                {filteredActivities.length} of {activities.length} application{activities.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-text-secondary py-8">
                        No applications match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivities.map((activity) => (
                      <TableRow
                        key={activity.id}
                        className="cursor-pointer hover:bg-neutral-50"
                        onClick={() => {
                          setSelectedActivity(activity)
                          setDetailOpen(true)
                        }}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setSelectedActivity(activity)
                            setDetailOpen(true)
                          }
                        }}
                      >
                        <TableCell className="text-sm text-text-secondary">
                          {formatDate(activity.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm text-text-primary">{activity.jobTitle}</p>
                            {activity.notes && (
                              <p className="text-xs text-text-tertiary mt-1">{activity.notes}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-text-secondary">
                          {activity.company}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {activity.platform}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(activity.status)}</TableCell>
                        <TableCell>
                          {activity.url && (
                            <a
                              href={activity.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700"
                              aria-label={`View ${activity.jobTitle} at ${activity.company}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <ActivityDetailModal
            activity={selectedActivity ? toDetailEntry(selectedActivity) : null}
            open={detailOpen}
            onOpenChange={setDetailOpen}
          />
        </>
      )}
    </div>
  )
}

function toDetailEntry(a: ActivityEntry): ActivityDetailEntry {
  return {
    id: a.id,
    jobTitle: a.jobTitle,
    company: a.company,
    status: a.status,
    submittedAt: a.timestamp,
    platform: a.platform,
    url: a.url,
    notes: a.notes,
    errorMessage: a.errorMessage,
    artifactUrl: a.artifactUrl,
  }
}

