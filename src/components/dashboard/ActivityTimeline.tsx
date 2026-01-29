/**
 * ActivityTimeline Component
 * 
 * Right side or lower panel showing a simple visual timeline or log
 * of recent applications with status flags (Draft, Submitted, Interview, Rejected).
 */

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ActivityDetailModal, type ActivityDetailEntry } from "@/components/shared/ActivityDetailModal"

export type ApplicationStatus = "draft" | "submitted" | "interview" | "rejected" | "pending"

export interface ActivityLogEntry {
  id: string
  jobTitle: string
  company: string
  status: ApplicationStatus
  submittedAt?: string
  platform?: string
  url?: string
  notes?: string
  errorMessage?: string
  artifactUrl?: string | null
}

export interface ActivityTimelineProps {
  /** List of recent application activities */
  activities?: ActivityLogEntry[]
  /** Maximum number of activities to show */
  maxItems?: number
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities = [],
  maxItems = 10,
}) => {
  const [platformFilter, setPlatformFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [dateFrom, setDateFrom] = React.useState<string>("")
  const [dateTo, setDateTo] = React.useState<string>("")
  const [showFilters, setShowFilters] = React.useState(false)
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityLogEntry | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  // Get unique platforms and statuses
  const platforms = React.useMemo(() => {
    const unique = Array.from(new Set(activities.map(a => a.platform).filter(Boolean)))
    return unique.sort()
  }, [activities])

  const statuses = React.useMemo(() => {
    const unique = Array.from(new Set(activities.map(a => a.status)))
    return unique.sort()
  }, [activities])

  // Filter activities
  const filteredActivities = React.useMemo(() => {
    let filtered = [...activities]

    // Filter by platform
    if (platformFilter !== "all") {
      filtered = filtered.filter(a => a.platform === platformFilter)
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(a => a.status === statusFilter)
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(a => {
        if (!a.submittedAt) return false
        const activityDate = new Date(a.submittedAt)
        activityDate.setHours(0, 0, 0, 0)
        return activityDate >= fromDate
      })
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(a => {
        if (!a.submittedAt) return false
        const activityDate = new Date(a.submittedAt)
        return activityDate <= toDate
      })
    }

    return filtered
  }, [activities, platformFilter, statusFilter, dateFrom, dateTo])

  const displayActivities = filteredActivities.slice(0, maxItems)
  
  const hasActiveFilters = platformFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo

  const clearFilters = () => {
    setPlatformFilter("all")
    setStatusFilter("all")
    setDateFrom("")
    setDateTo("")
  }

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "submitted":
        return <Badge variant="success">Submitted</Badge>
      case "interview":
        return <Badge variant="info">Interview</Badge>
      case "rejected":
        return <Badge variant="error">Rejected</Badge>
      case "pending":
        return <Badge variant="warning">Pending</Badge>
      case "draft":
      default:
        return <Badge variant="outline">Draft</Badge>
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—"
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return "Today"
      } else if (diffDays === 1) {
        return "Yesterday"
      } else if (diffDays < 7) {
        return `${diffDays} days ago`
      } else {
        return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      }
    } catch {
      return dateString
    }
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Your job application history will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary">
              No applications logged yet. Once you start applying, your activity will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (filteredActivities.length === 0 && hasActiveFilters) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Your job search log showing all applications submitted through JobFlow
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="mb-4 p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Filter activity</Label>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Clear filters
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {platforms.length > 0 && (
                  <div>
                    <Label htmlFor="platform-filter" className="text-xs">Platform</Label>
                    <Select
                      id="platform-filter"
                      value={platformFilter}
                      onChange={(e) => setPlatformFilter(e.target.value)}
                    >
                      <option value="all">All platforms</option>
                      {platforms.map(platform => (
                        <option key={platform} value={platform}>{platform}</option>
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
                  >
                    <option value="all">All statuses</option>
                    {statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date-from" className="text-xs">From date</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="date-to" className="text-xs">To date</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary">
              No activities match your filters. Try adjusting your filter criteria.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3">
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Your job search log showing all applications submitted through JobFlow
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="info" className="ml-1 h-4 px-1.5 text-xs">
                {[platformFilter !== "all" && "1", statusFilter !== "all" && "1", dateFrom && "1", dateTo && "1"].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="mb-4 p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Filter activity</Label>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {platforms.length > 0 && (
                <div>
                  <Label htmlFor="platform-filter" className="text-xs">Platform</Label>
                  <Select
                    id="platform-filter"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                  >
                    <option value="all">All platforms</option>
                    {platforms.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
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
                >
                  <option value="all">All statuses</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="date-from" className="text-xs">From date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date-to" className="text-xs">To date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {/* Timeline view for smaller screens */}
          <div className="block sm:hidden space-y-4" role="list" aria-label="Recent job application activity">
            {displayActivities.map((activity, index) => (
              <button
                type="button"
                key={activity.id}
                role="listitem"
                className={cn(
                  "relative pl-6 pb-4 w-full text-left rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blueAccent focus:ring-offset-2",
                  index !== displayActivities.length - 1 && "border-l-2 border-neutral-200"
                )}
                onClick={() => {
                  setSelectedActivity(activity)
                  setDetailOpen(true)
                }}
              >
                <div className="absolute left-0 top-0 w-3 h-3 -translate-x-[7px] rounded-full bg-primary-500 border-2 border-white" />
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-text-primary">{activity.jobTitle}</p>
                      <p className="text-xs text-text-secondary">{activity.company}</p>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-tertiary">
                    <span>{formatDate(activity.submittedAt)}</span>
                    {activity.platform && <span>{activity.platform}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Table view for larger screens */}
          <div className="hidden sm:block">
            <Table role="table" aria-label="Recent job application activity">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]" scope="col">Job</TableHead>
                  <TableHead className="w-[20%]" scope="col">Status</TableHead>
                  <TableHead className="w-[20%]" scope="col">Date</TableHead>
                  <TableHead className="w-[20%]" scope="col">Platform</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayActivities.map((activity) => (
                  <TableRow
                    key={activity.id}
                    className="cursor-pointer hover:bg-neutral-50 focus-within:bg-neutral-50"
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
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-text-primary">{activity.jobTitle}</p>
                        <p className="text-xs text-text-secondary">{activity.company}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(activity.status)}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {formatDate(activity.submittedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-text-tertiary">
                      {activity.platform || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredActivities.length > maxItems && (
            <div className="text-center pt-2">
              <p className="text-xs text-text-tertiary">
                Showing {maxItems} of {filteredActivities.length} {hasActiveFilters ? "filtered" : ""} activities
              </p>
            </div>
          )}
          {hasActiveFilters && filteredActivities.length <= maxItems && (
            <div className="text-center pt-2">
              <p className="text-xs text-text-tertiary">
                Showing {filteredActivities.length} of {activities.length} activities
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <ActivityDetailModal
        activity={selectedActivity ? activityToDetailEntry(selectedActivity) : null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </Card>
  )
}

function activityToDetailEntry(a: ActivityLogEntry): ActivityDetailEntry {
  return {
    id: a.id,
    jobTitle: a.jobTitle,
    company: a.company,
    status: a.status,
    submittedAt: a.submittedAt,
    platform: a.platform,
    url: a.url,
    notes: a.notes,
    errorMessage: a.errorMessage,
    artifactUrl: a.artifactUrl,
  }
}

