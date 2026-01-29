/**
 * AutomationRunCard Component
 * 
 * Card showing automation run status and controls.
 * Displays last run time, applications from last run, current status, and Start button.
 */

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/shared/KPICard"
import { EmptyState } from "@/components/shared"
import { Play, Loader2, AlertTriangle, CheckCircle, XCircle, AlertCircle } from "lucide-react"

export type RunStatus = "idle" | "running" | "failed" | "queued" | "requires_auth"

export interface RunSummary {
  /** Total applications attempted in last run */
  totalApplicationsAttempted?: number
  /** Total successfully applied */
  totalApplied?: number
  /** Number skipped */
  skippedCount?: number
  /** Number with errors */
  errorCount?: number
  /** Main platforms used (comma-separated or array) */
  platforms?: string[] | string
}

export interface RunConfig {
  /** Platforms that will be used (e.g., ["Indeed", "Greenhouse"]) */
  platforms?: string[]
  /** Daily application cap */
  dailyCap?: number
}

export interface AutomationRunCardProps {
  /** Last run timestamp */
  lastRunTime?: string | null
  /** Applications from last run */
  applicationsLastRun?: number
  /** Current run status */
  status: RunStatus
  /** Whether a run is currently in progress */
  isRunning: boolean
  /** Pre-run configuration info */
  config?: RunConfig
  /** Post-run summary (shown after run completes) */
  runSummary?: RunSummary | null
  /** Whether discover-only mode is enabled */
  discoverOnly?: boolean
  /** Whether last run was discover-only */
  lastRunWasDiscoverOnly?: boolean
  /** Callback when Start button is clicked */
  onStart: () => void
}

export const AutomationRunCard: React.FC<AutomationRunCardProps> = ({
  lastRunTime,
  applicationsLastRun = 0,
  status,
  isRunning,
  config,
  runSummary,
  discoverOnly = false,
  lastRunWasDiscoverOnly = false,
  onStart,
}) => {
  const hasRunBefore = !!lastRunTime
  const errorRate = runSummary?.totalApplicationsAttempted 
    ? (runSummary.errorCount || 0) / runSummary.totalApplicationsAttempted 
    : 0
  const hasManyErrors = errorRate > 0.3 // More than 30% errors

  // Format platforms for display
  const formatPlatforms = (platforms?: string[] | string): string => {
    if (!platforms) return "job boards"
    if (typeof platforms === "string") return platforms
    if (platforms.length === 0) return "job boards"
    if (platforms.length === 1) return platforms[0]
    if (platforms.length === 2) return `${platforms[0]} and ${platforms[1]}`
    return `${platforms.slice(0, -1).join(", ")}, and ${platforms[platforms.length - 1]}`
  }

  const platformsList = config?.platforms || []
  const dailyCap = config?.dailyCap

  // Show empty state if no run yet
  if (!hasRunBefore && !isRunning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Automation run</CardTitle>
          <CardDescription>
            Start your first job search and application run
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No runs yet"
            description="Start your first automation run to begin applying to jobs automatically. JobFlow will search for jobs and submit applications based on your preferences."
            icon={<Play className="h-12 w-12 text-neutral-400" />}
            action={
              <Button onClick={onStart} size="lg">
                <Play className="h-4 w-4 mr-2" />
                Start your first run
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }
  const formatLastRunTime = (timestamp?: string | null): string => {
    if (!timestamp) return "Never"
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
      
      return date.toLocaleDateString("en-GB", { 
        day: "numeric", 
        month: "short", 
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined 
      })
    } catch {
      return "Unknown"
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case "running":
      case "queued":
        return <Badge variant="info" className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status === "queued" ? "Queued" : "Running"}
        </Badge>
      case "requires_auth":
        return <Badge variant="warning">Re-sign-in required</Badge>
      case "failed":
        return <Badge variant="error">Failed recently</Badge>
      case "idle":
      default:
        return <Badge variant="outline">Idle</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Automation run</CardTitle>
            <CardDescription>
              Start a new job search and application run
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={discoverOnly ? "warning" : "info"} className="text-xs">
              {discoverOnly ? "Discover only" : "Discover and apply"}
            </Badge>
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pre-run Information */}
        {!isRunning && (
          <div className={`rounded-md border p-4 space-y-2 ${discoverOnly ? "bg-warning-50 border-warning-200" : "bg-info-50 border-info-200"}`}>
            <p className={`text-sm font-medium ${discoverOnly ? "text-warning-900" : "text-info-900"}`}>
              {discoverOnly ? "Mode: Discover only (no applications will be submitted)" : "What will happen:"}
            </p>
            <ul className={`text-sm space-y-1 list-disc list-inside ${discoverOnly ? "text-warning-800" : "text-info-800"}`}>
              <li>
                Today JobFlow will look for jobs on: <strong>{formatPlatforms(platformsList)}</strong>.
              </li>
              {discoverOnly ? (
                <li>
                  <strong>No applications will be submitted.</strong> Jobs will be added to your queue for review.
                </li>
              ) : (
                <>
                  {dailyCap && (
                    <li>
                      Daily cap: <strong>{dailyCap} applications</strong>
                    </li>
                  )}
                  <li>
                    Applications will be submitted automatically for matching jobs.
                  </li>
                </>
              )}
              <li>
                You can stop runs at any time by closing the automation window.
              </li>
            </ul>
          </div>
        )}

        {/* Post-run Summary */}
        {runSummary && !isRunning && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-text-primary mb-3">
                Last run summary {lastRunWasDiscoverOnly && <Badge variant="warning" className="ml-2 text-xs">Discover only</Badge>}
              </p>
              {lastRunWasDiscoverOnly ? (
                <div className="rounded-md bg-info-50 border border-info-200 p-4">
                  <p className="text-sm text-info-800">
                    <strong>Jobs discovered:</strong> {runSummary.totalApplicationsAttempted || 0} job{(runSummary.totalApplicationsAttempted || 0) !== 1 ? "s" : ""} found and added to your queue.
                  </p>
                  <p className="text-sm text-info-700 mt-2">
                    Review and approve jobs from the <strong>Jobs</strong> page before running an apply-only session.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {runSummary.totalApplicationsAttempted !== undefined && (
                      <KPICard
                        title="Attempted"
                        value={runSummary.totalApplicationsAttempted}
                        variant="info"
                        icon={<AlertCircle className="h-4 w-4" />}
                      />
                    )}
                    {runSummary.totalApplied !== undefined && (
                      <KPICard
                        title="Applied"
                        value={runSummary.totalApplied}
                        variant="success"
                        icon={<CheckCircle className="h-4 w-4" />}
                      />
                    )}
                    {runSummary.skippedCount !== undefined && runSummary.skippedCount > 0 && (
                      <KPICard
                        title="Skipped"
                        value={runSummary.skippedCount}
                        variant="warning"
                        icon={<AlertCircle className="h-4 w-4" />}
                      />
                    )}
                    {runSummary.errorCount !== undefined && runSummary.errorCount > 0 && (
                      <KPICard
                        title="Errors"
                        value={runSummary.errorCount}
                        variant="error"
                        icon={<XCircle className="h-4 w-4" />}
                      />
                    )}
                  </div>
                  {runSummary.platforms && (
                    <div className="text-sm text-text-secondary">
                      <span className="font-medium">Platforms used:</span>{" "}
                      {typeof runSummary.platforms === "string" 
                        ? runSummary.platforms 
                        : formatPlatforms(runSummary.platforms)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Re-auth required (pilot-friendly) */}
        {status === "requires_auth" && !isRunning && (
          <div className="rounded-md bg-warning-50 border border-warning-200 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning-900">
                  Re-sign-in required
                </p>
                <p className="text-sm text-warning-800 mt-1">
                  The job board has asked you to sign in again. Please run automation and sign in when the browser opens, or sign in on the job board website first, then try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Warning */}
        {hasManyErrors && !isRunning && (
          <div className="rounded-md bg-warning-50 border border-warning-200 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning-900">
                  We had trouble completing some applications
                </p>
                <p className="text-sm text-warning-800 mt-1">
                  This could be due to site changes or login issues. You can try again or check your job board logins.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Last Run Info */}
        {hasRunBefore && (
          <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
            <div>
              <p className="text-sm text-text-secondary">Last run</p>
              <p className="text-base font-medium text-text-primary mt-1">
                {formatLastRunTime(lastRunTime)}
              </p>
            </div>
            {lastRunTime && (
              <div>
                <p className="text-sm text-text-secondary">Applications last run</p>
                <p className="text-base font-medium text-text-primary mt-1">
                  {applicationsLastRun} {applicationsLastRun === 1 ? "application" : "applications"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Start Button */}
        <Button
          onClick={onStart}
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start new run
            </>
          )}
        </Button>

        {isRunning && (
          <p className="text-sm text-text-secondary text-center">
            Automation is running. You can keep this page open while we work.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
