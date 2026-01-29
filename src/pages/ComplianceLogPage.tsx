/**
 * ComplianceLogPage Component
 * 
 * Compliance log view showing weekly application totals
 * and evidence for work coach meetings.
 */

import * as React from "react"
import { apiGet } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PageHeader, ErrorState } from "@/components/shared"
import { CheckCircle2, AlertCircle, Printer, Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivityEntry {
  id: string
  timestamp: string
  jobTitle: string
  company: string
  status: string
  platform: string
  url?: string
}

interface StatusResponse {
  stats: {
    total: number
    applied: number
    skip: number
    error: number
  }
  activity: ActivityEntry[]
}

interface WeeklySummary {
  weekStart: Date
  weekEnd: Date
  applications: ActivityEntry[]
  appliedCount: number
  requiredCount: number
  isCompliant: boolean
}

const DEFAULT_REQUIRED_PER_WEEK = 10

export const ComplianceLogPage: React.FC = () => {
  const [weeklySummaries, setWeeklySummaries] = React.useState<WeeklySummary[]>([])
  const [requiredPerWeek, setRequiredPerWeek] = React.useState<number>(DEFAULT_REQUIRED_PER_WEEK)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetchAndGroupActivities()
  }, [])

  const fetchAndGroupActivities = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Try to fetch from the new compliance endpoint first
      try {
        const complianceResponse = await apiGet<{
          weekly_summaries: Array<{
            week_start_date: string
            week_end_date: string
            applications_count: number
            required_count: number
            missed_requirement: boolean
            evidence_entries: Array<{
              claimant_id: string
              event_type: string
              description: string
              timestamp: string
              week_start_date?: string
              source: string
              job_id?: string
              job_title?: string
              company?: string
              platform?: string
              url?: string
            }>
          }>
          required_applications_per_week: number
        }>("/api/claimant/compliance")
        
        // Transform compliance API response to WeeklySummary format
        const summaries: WeeklySummary[] = complianceResponse.weekly_summaries.map((week) => {
          // Transform evidence entries to ActivityEntry format
          const activities: ActivityEntry[] = week.evidence_entries
            .filter((e) => 
              e.event_type === "application_submitted" || 
              e.event_type === "application_approved" ||
              e.event_type === "application_rejected"
            )
            .map((e, idx) => ({
              id: e.job_id || `evidence-${idx}`,
              timestamp: e.timestamp,
              jobTitle: e.job_title || "Unknown",
              company: e.company || "Unknown",
              status: e.event_type === "application_submitted" ? "applied" : 
                      e.event_type === "application_rejected" ? "rejected" : "pending",
              platform: e.platform || "unknown",
              url: e.url,
            }))
          
          return {
            weekStart: new Date(week.week_start_date),
            weekEnd: new Date(week.week_end_date),
            applications: activities,
            appliedCount: week.applications_count,
            requiredCount: week.required_count,
            isCompliant: !week.missed_requirement,
          }
        })
        
        setWeeklySummaries(summaries)
        setRequiredPerWeek(complianceResponse.required_applications_per_week ?? DEFAULT_REQUIRED_PER_WEEK)
        return
      } catch {
        // Fall back to status endpoint if compliance endpoint fails
      }
      
      // Fallback to old method
      const response = await apiGet<StatusResponse>("/api/claimant/status")
      const activities = response.activity || []

      // Group activities by week
      const grouped = groupByWeek(activities)
      setWeeklySummaries(grouped)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compliance log")
      setWeeklySummaries([])
    } finally {
      setIsLoading(false)
    }
  }

  const groupByWeek = (activities: ActivityEntry[]): WeeklySummary[] => {
    const weekMap = new Map<string, ActivityEntry[]>()

    // Group activities by week
    activities.forEach((activity) => {
      const date = new Date(activity.timestamp)
      const weekStart = getWeekStart(date)
      const weekKey = weekStart.toISOString().split("T")[0]

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, [])
      }
      weekMap.get(weekKey)!.push(activity)
    })

    // Convert to weekly summaries
    const summaries: WeeklySummary[] = []
    weekMap.forEach((weekActivities, weekKey) => {
      const weekStart = new Date(weekKey)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const appliedCount = weekActivities.filter(
        (a) => a.status.toLowerCase() === "applied" || a.status.toLowerCase() === "submitted"
      ).length

      summaries.push({
        weekStart,
        weekEnd,
        applications: weekActivities.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        appliedCount,
        requiredCount: DEFAULT_REQUIRED_PER_WEEK,
        isCompliant: appliedCount >= DEFAULT_REQUIRED_PER_WEEK,
      })
    })

    // Sort by week start date (newest first)
    return summaries.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
  }

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday as week start
    return new Date(d.setDate(diff))
  }

  const formatWeekRange = (weekStart: Date, weekEnd: Date): string => {
    return `${weekStart.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    })} - ${weekEnd.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const downloadEvidence = async (format: "csv" | "pdf") => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || ""
      const response = await fetch(
        `${baseUrl}/api/claimant/evidence/export?format=${format}`,
        { method: "GET", credentials: "include" }
      )
      if (!response.ok) throw new Error("Failed to export evidence")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const ext = format === "pdf" ? "pdf" : "csv"
      a.download = `evidence_export_${new Date().toISOString().split("T")[0]}.${ext}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      window.print()
    }
  }

  const handleExport = () => downloadEvidence("csv")
  const handleExportPdf = () => downloadEvidence("pdf")

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Compliance log"
          description="Loading your compliance log..."
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
        <PageHeader title="Compliance log" />
        <ErrorState
          title="Unable to load compliance log"
          message={error}
          onRetry={fetchAndGroupActivities}
        />
      </div>
    )
  }

  const totalApplied = weeklySummaries.reduce((sum, week) => sum + week.appliedCount, 0)
  const requiredPerWeekForTotal = weeklySummaries[0]?.requiredCount ?? requiredPerWeek
  const totalRequired = weeklySummaries.length * requiredPerWeekForTotal
  const overallCompliant = totalApplied >= totalRequired

  return (
    <div className="space-y-6 print:space-y-4" data-testid="compliance-log-page">
      <div className="flex items-center justify-between print:hidden">
        <PageHeader
          title="Compliance log"
          description="View your weekly application evidence and compliance status. This log shows all your job search activity and can be shared with your work coach as evidence of meeting your job search requirements."
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle>Overall Summary</CardTitle>
          <CardDescription>Total applications across all weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-text-secondary">Total Applied</p>
              <p className="text-2xl font-bold text-text-primary">{totalApplied}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Required</p>
              <p className="text-2xl font-bold text-text-primary">{totalRequired}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {overallCompliant ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success-600" />
                    <span className="text-lg font-semibold text-success-700">Compliant</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-warning-600" />
                    <span className="text-lg font-semibold text-warning-700">
                      {totalApplied < totalRequired * 0.8 ? "Non-compliant" : "At risk"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Summaries */}
      {weeklySummaries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-text-secondary">No application activity recorded yet.</p>
            <p className="text-sm text-text-tertiary mt-2">
              Applications will appear here once you start applying to jobs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {weeklySummaries.map((week, index) => (
            <Card key={index} className="print:break-inside-avoid">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Week of {formatWeekRange(week.weekStart, week.weekEnd)}</CardTitle>
                    <CardDescription>
                      {week.appliedCount} of {week.requiredCount} required applications
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      week.isCompliant
                        ? "bg-success-50 text-success-700 border-success-200"
                        : week.appliedCount >= week.requiredCount * 0.8
                        ? "bg-warning-50 text-warning-700 border-warning-200"
                        : "bg-error-50 text-error-700 border-error-200"
                    )}
                  >
                    {week.isCompliant ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Compliant
                      </>
                    ) : week.appliedCount >= week.requiredCount * 0.8 ? (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        At risk
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Non-compliant
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {week.applications.length === 0 ? (
                  <p className="text-text-secondary text-sm">No applications this week.</p>
                ) : (
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
                      {week.applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell className="text-sm text-text-secondary">
                            {formatDate(application.timestamp)}
                          </TableCell>
                          <TableCell className="font-medium text-sm text-text-primary">
                            {application.jobTitle}
                          </TableCell>
                          <TableCell className="text-sm text-text-secondary">
                            {application.company}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {application.platform}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {application.status.toLowerCase() === "applied" ||
                            application.status.toLowerCase() === "submitted" ? (
                              <Badge variant="outline" className="bg-success-50 text-success-700 border-success-200">
                                Applied
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-neutral-50 text-neutral-700">
                                {application.status}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Print-only footer */}
      <div className="hidden print:block mt-8 text-sm text-text-secondary text-center">
        <p>Generated on {new Date().toLocaleDateString("en-GB")}</p>
        <p>JobFlow Compliance Log</p>
      </div>
    </div>
  )
}

