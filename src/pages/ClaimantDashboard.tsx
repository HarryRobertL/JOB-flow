/**
 * ClaimantDashboard Page
 * 
 * Main dashboard for claimants that answers three key questions:
 * 1. What is my current job search requirement for this period
 * 2. What have I already done and is it enough
 * 3. What should I do next
 * 
 * Uses GOV-style inspired design with clear compliance messaging.
 */

import * as React from "react"
import { ComplianceSummary } from "@/components/dashboard/ComplianceSummary"
import { UpcomingTasks, type JobApplication } from "@/components/dashboard/UpcomingTasks"
import { ActivityTimeline, type ActivityLogEntry } from "@/components/dashboard/ActivityTimeline"
import { AutomationRunCard, type RunStatus } from "@/components/dashboard/AutomationRunCard"
import { PageHeader, ErrorState, EmptyState, OfflineState } from "@/components/shared"
import { apiPost, isOfflineError } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, FileText, Settings } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAnalytics } from "@/lib/useAnalytics"
import { useToast } from "@/contexts/ToastContext"

import type { RunConfig, RunSummary } from "@/components/dashboard/AutomationRunCard"

export interface ClaimantDashboardProps {
  /** Dashboard data - can be fetched from API or passed as props */
  data?: {
    /** True if claimant skipped onboarding; show limited-state message */
    skippedOnboarding?: boolean
    compliance?: {
      requiredApplications?: number
      completedApplications?: number
      overdueCount?: number
      nextAppointment?: string | null
      periodLabel?: string
      weeklyStats?: {
        applied?: number
        skipped?: number
        error?: number
      }
    }
    upcomingTasks?: JobApplication[]
    recentActivity?: ActivityLogEntry[]
    runStatus?: {
      lastRunTime?: string | null
      applicationsLastRun?: number
      status: RunStatus
    }
    runConfig?: RunConfig
    runSummary?: RunSummary | null
    discoverOnly?: boolean
    lastRunWasDiscoverOnly?: boolean
  }
  /** Loading state */
  isLoading?: boolean
  /** Error state */
  error?: string | null
  /** Retry function for error state */
  onRetry?: () => void
  /** Whether a run is currently in progress */
  isRunInProgress?: boolean
  /** Callback when Start run button is clicked */
  onStartRun?: () => void
}

export const ClaimantDashboard: React.FC<ClaimantDashboardProps> = ({
  data,
  isLoading = false,
  error = null,
  onRetry,
  isRunInProgress = false,
  onStartRun,
}) => {
  useAnalytics({
    trackPageView: true,
    pageIdentifier: "claimant",
  })
  const { showToast } = useToast()
  const navigate = useNavigate()

  // Handler for evidence export
  const downloadEvidence = async (format: "csv" | "pdf") => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || ""
      const response = await fetch(
        `${baseUrl}/api/claimant/evidence/export?format=${format}`,
        { method: "GET", credentials: "include" }
      )
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to export evidence")
      }
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
      showToast({
        title: "Evidence downloaded",
        description: `Your job search evidence has been downloaded as ${format.toUpperCase()}. You can share this with your work coach.`,
        variant: "success",
      })
    } catch (err) {
      showToast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Failed to download evidence. Please try again.",
        variant: "error",
      })
    }
  }

  const handleExportEvidence = () => downloadEvidence("csv")
  const handleExportEvidencePdf = () => downloadEvidence("pdf")

  // Handler functions for task actions
  const handleReview = (taskId: string) => {
    navigate("/app/jobs", { state: { focusJobId: taskId } })
  }

  const handleSubmit = async (taskId: string) => {
    try {
      const res = await apiPost<{
        approvedJobIds?: string[]
      }>("/api/claimant/applications/batch", {
        applications: [{ jobId: taskId, action: "approve" as const }],
      })
      showToast({
        title: "Approved",
        description: "That job has been approved. We'll start processing it in the background.",
        variant: "success",
      })
      navigate("/app/applications/review", {
        state: { approvedJobIds: res.approvedJobIds ?? [taskId] },
      })
    } catch (err) {
      showToast({
        title: "Could not approve",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      })
    }
  }

  const handleView = (taskId: string) => {
    navigate("/app/jobs", { state: { focusJobId: taskId } })
  }

  if (isLoading) {
    return (
        <div className="space-y-6">
          <PageHeader
            title="Dashboard"
            description="Loading your job search information..."
          />
          <div className="space-y-4">
            <div className="h-32 bg-neutral-100 rounded-lg animate-pulse" />
            <div className="h-64 bg-neutral-100 rounded-lg animate-pulse" />
            <div className="h-48 bg-neutral-100 rounded-lg animate-pulse" />
          </div>
        </div>
    )
  }

  if (error) {
    const isOffline = isOfflineError(new Error(error))
    return (
        <div className="space-y-6">
          <PageHeader title="Dashboard" />
          {isOffline ? (
            <OfflineState
              isOffline={true}
              onRetry={onRetry || (() => window.location.reload())}
            />
          ) : (
            <ErrorState
              title="Unable to load dashboard"
              message={error || "An error occurred while loading your dashboard"}
              details="Please try refreshing the page or contact support if the problem persists."
              onRetry={onRetry || (() => window.location.reload())}
            />
          )}
        </div>
    )
  }

  const required = data?.compliance?.requiredApplications ?? 0
  const completed = data?.compliance?.completedApplications ?? 0
  const isOnTrack = completed >= required
  const remaining = Math.max(0, required - completed)

  return (
      <div className="space-y-6" data-testid="claimant-dashboard">
        {data?.skippedOnboarding && (
          <Card className="border-warning-200 bg-warning-50">
            <CardContent className="pt-6">
              <p className="text-sm text-warning-800">
                You skipped setup. Some features are limited until you complete your profile in Settings.
              </p>
              <Link
                to="/app/settings"
                className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bgLayer2 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blueAccent mt-3"
              >
                <Settings className="h-4 w-4" />
                Go to Settings
              </Link>
            </CardContent>
          </Card>
        )}
        <PageHeader
          title="Your dashboard"
          description={
            isOnTrack
              ? `You've completed ${completed} of ${required} required applications this week. You're on track!`
              : `You need to complete ${remaining} more application${remaining !== 1 ? "s" : ""} this week to meet your requirement of ${required} applications.`
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleExportEvidence}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                onClick={handleExportEvidencePdf}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          }
        />

        {/* Automation Run Section */}
        {onStartRun && (
          <section aria-labelledby="automation-run-heading">
            <h2 id="automation-run-heading" className="sr-only">Automation run control</h2>
            <AutomationRunCard
              lastRunTime={data?.runStatus?.lastRunTime}
              applicationsLastRun={data?.runStatus?.applicationsLastRun}
              status={isRunInProgress ? "running" : (data?.runStatus?.status || "idle")}
              isRunning={isRunInProgress}
              config={data?.runConfig}
              runSummary={data?.runSummary}
              discoverOnly={data?.discoverOnly}
              lastRunWasDiscoverOnly={data?.lastRunWasDiscoverOnly}
              onStart={onStartRun}
            />
          </section>
        )}

        {/* Top Section: Compliance Summary */}
        <section aria-labelledby="compliance-heading">
          <h2 id="compliance-heading" className="sr-only">Job search requirement and compliance</h2>
          <ComplianceSummary
            requiredApplications={data?.compliance?.requiredApplications}
            completedApplications={data?.compliance?.completedApplications}
            overdueCount={data?.compliance?.overdueCount}
            nextAppointment={data?.compliance?.nextAppointment}
            periodLabel={data?.compliance?.periodLabel}
            weeklyStats={data?.compliance?.weeklyStats}
          />
        </section>

        {/* Main Content: Two Column Layout on Desktop, Stacked on Mobile */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Central Panel: Upcoming Tasks (takes 2 columns on desktop) */}
          <section className="lg:col-span-2" aria-labelledby="upcoming-tasks-heading">
            <h2 id="upcoming-tasks-heading" className="sr-only">Suggested applications</h2>
            <UpcomingTasks
              tasks={data?.upcomingTasks}
              onReview={handleReview}
              onSubmit={handleSubmit}
              onView={handleView}
            />
          </section>

          {/* Right Panel: Activity Timeline (takes 1 column on desktop) */}
          <aside className="lg:col-span-1" aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="sr-only">Recent activity</h2>
            {(!data?.recentActivity || data.recentActivity.length === 0) && !isLoading ? (
              <EmptyState
                title="No activity yet"
                description="Activity will appear here after your first job application run. Once JobFlow starts finding and applying to jobs, you'll see your application history here."
                icon={<FileText className="h-12 w-12 text-neutral-400" />}
              />
            ) : (
              <ActivityTimeline activities={data?.recentActivity} />
            )}
          </aside>
        </div>
      </div>
  )
}

