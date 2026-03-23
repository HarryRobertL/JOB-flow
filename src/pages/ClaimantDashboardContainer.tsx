/**
 * ClaimantDashboardContainer
 * 
 * Container component that fetches data and passes it to ClaimantDashboard.
 * Shows a one-time welcome banner after onboarding completion.
 */

import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ClaimantDashboard } from "./ClaimantDashboard"
import { apiGet, startAutomationRun } from "@/lib/apiClient"
import { useAnalytics } from "@/lib/useAnalytics"
import { useToast } from "@/contexts/ToastContext"
import { trackEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { X } from "lucide-react"
import type { RunStatus } from "@/components/dashboard/AutomationRunCard"
import type { RunConfig, RunSummary } from "@/components/dashboard/AutomationRunCard"
import type { JobApplication } from "@/components/dashboard/UpcomingTasks"

const WELCOME_BANNER_STORAGE_KEY = "autoapplyer.justCompletedOnboarding"

export function ClaimantDashboardContainer() {
  useAnalytics({
    trackPageView: true,
    pageIdentifier: "claimant",
  })
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [data, setData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showWelcomeBanner, setShowWelcomeBanner] = React.useState(false)
  const [isRunInProgress, setIsRunInProgress] = React.useState(false)
  const [runStartTime, setRunStartTime] = React.useState<string | null>(null)
  const [lastKnownRunTime, setLastKnownRunTime] = React.useState<string | null>(null)
  const [lastKnownStats, setLastKnownStats] = React.useState<any>(null)
  const [discoverOnly, setDiscoverOnly] = React.useState(false)
  const [requireReview, setRequireReview] = React.useState(true)
  const [lastRunWasDiscoverOnly, setLastRunWasDiscoverOnly] = React.useState(false)
  const [currentRunIsDiscoverOnly, setCurrentRunIsDiscoverOnly] = React.useState(false)
  const pollingIntervalRef = React.useRef<number | null>(null)
  const welcomeBannerCheckedRef = React.useRef(false)

  // Fetch profile to get discoverOnly setting
  const fetchProfile = React.useCallback(async () => {
    try {
      const profileResponse = await apiGet<{
        discoverOnly?: boolean
        requireReview?: boolean
      }>("/api/claimant/profile").catch(() => null)
      if (profileResponse?.discoverOnly !== undefined) setDiscoverOnly(profileResponse.discoverOnly)
      if (profileResponse?.requireReview !== undefined) setRequireReview(profileResponse.requireReview)
    } catch {
      // Profile endpoint might not exist yet, use default
    }
  }, [])

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
        const [response, automationStatusResponse] = await Promise.all([
          apiGet<{ stats: any; activity: any[]; compliance?: any }>("/api/claimant/status"),
          apiGet<{ status: string }>("/api/automation/status").catch(() => ({ status: "idle" })),
        ])

        const jobsResponse = await apiGet<{ jobs: any[] }>("/api/claimant/jobs?limit=50&offset=0").catch(() => null)
        const upcomingTasks: JobApplication[] = (jobsResponse?.jobs || [])
          .filter((j: any) => (j?.status || "").toLowerCase() === "pending")
          .slice(0, 5)
          .map((j: any) => ({
            id: String(j.id),
            title: j.title || j.job_title || "Unknown role",
            company: j.company || "Unknown",
            location: j.location,
            status: requireReview ? "pending_review" : "ready_to_submit",
            requiresReview: requireReview,
            url: j.url,
            queuedAt: j.discoveredAt,
          }))
        
        // Transform API response to match ClaimantDashboard expected format
        const compliance = response.compliance || {
          week_start: new Date().toISOString(),
          week_end: new Date().toISOString(),
          applications_this_week: 0,
          required_applications: 10,
          is_compliant: false,
        }
        
        // Calculate weekly stats from activity for current week
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0)
        
        const currentWeekActivity = (response.activity || []).filter((item: any) => {
          if (!item.timestamp) return false
          const itemDate = new Date(item.timestamp)
          return itemDate >= weekStart
        })
        
        const weeklyStats = {
          applied: currentWeekActivity.filter((item: any) => item.status === "applied").length,
          skipped: currentWeekActivity.filter((item: any) => item.status === "skip").length,
          error: currentWeekActivity.filter((item: any) => item.status === "error").length,
        }
        
        const lastRunTime = response.stats.last_run || null
        
        // Check if run has completed (new last_run timestamp after we started)
        if (isRunInProgress && runStartTime && lastRunTime) {
          const lastRunDate = new Date(lastRunTime)
          const startDate = new Date(runStartTime)
          // If last_run is newer than when we started, the run has completed
          if (lastRunDate > startDate || (lastKnownRunTime && lastRunTime !== lastKnownRunTime)) {
            setIsRunInProgress(false)
            setRunStartTime(null)
            
            // Store whether this run was discover-only
            const wasDiscoverOnly = currentRunIsDiscoverOnly
            setLastRunWasDiscoverOnly(wasDiscoverOnly)
            setCurrentRunIsDiscoverOnly(false)
            
            // Calculate run summary
            const previousApplied = lastKnownStats?.applied || 0
            const previousSkipped = lastKnownStats?.skip || 0
            const previousError = lastKnownStats?.error || 0
            
            const newApplied = response.stats.applied - previousApplied
            const newSkipped = response.stats.skip - previousSkipped
            const newErrors = response.stats.error - previousError
            const totalAttempted = wasDiscoverOnly 
              ? (response.activity || []).filter((item: any) => item.timestamp && new Date(item.timestamp) >= startDate).length
              : newApplied + newSkipped + newErrors
            
            // Extract platforms from recent activity
            const platforms = Array.from(
              new Set(
                (response.activity || [])
                  .filter((item: any) => item.timestamp && new Date(item.timestamp) >= startDate)
                  .map((item: any) => item.platform)
                  .filter(Boolean)
              )
            ) as string[]
            
            // Track analytics
            trackEvent({
              event: "run_completed",
              totalApplicationsAttempted: totalAttempted,
              totalApplied: wasDiscoverOnly ? 0 : newApplied,
              skippedCount: wasDiscoverOnly ? 0 : newSkipped,
              errorCount: wasDiscoverOnly ? 0 : newErrors,
              platforms: platforms.length > 0 ? platforms.join(", ") : "unknown",
            } as any) // Type assertion needed due to union type inference
            
            showToast({
              title: "Automation run completed",
              description: wasDiscoverOnly
                ? `Your discovery run has finished. ${totalAttempted} job${totalAttempted !== 1 ? "s" : ""} found and added to your queue. Review them on the Jobs page.`
                : `Your automation run has finished. ${newApplied > 0 ? `${newApplied} new application${newApplied !== 1 ? "s" : ""} submitted.` : "No new applications this run."}`,
              variant: "success",
            })
            
            // Stop polling
            if (pollingIntervalRef.current) {
              window.clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
          }
        }
        
        // Store stats for next comparison
        setLastKnownStats(response.stats)
        
        setLastKnownRunTime(lastRunTime)

        // Sync isRunInProgress with API when automation reports running/queued
        const automationStatus = (automationStatusResponse?.status || "idle") as string
        if (automationStatus === "running" || automationStatus === "queued") {
          setIsRunInProgress(true)
        }

        // Determine run status from automation API when present, else local/heuristic
        let runStatus: RunStatus = "idle"
        if (automationStatus === "queued" || automationStatus === "running" || automationStatus === "requires_auth") {
          runStatus = automationStatus as RunStatus
        } else if (isRunInProgress) {
          runStatus = "running"
        } else if (response.stats.error > 0 && lastRunTime) {
          const runDate = new Date(lastRunTime)
          const now = new Date()
          const hoursSinceRun = (now.getTime() - runDate.getTime()) / (1000 * 60 * 60)
          if (hoursSinceRun < 1) {
            runStatus = "failed"
          }
        }
        
        // Extract platforms from activity (for config display)
        const allPlatforms = Array.from(
          new Set(
            (response.activity || [])
              .map((item: any) => item.platform)
              .filter(Boolean)
          )
        ) as string[]
        
        // Calculate run summary if we have previous stats
        let runSummary: RunSummary | null = null
        if (lastKnownStats && lastRunTime && !isRunInProgress) {
          const previousApplied = lastKnownStats.applied || 0
          const previousSkipped = lastKnownStats.skip || 0
          const previousError = lastKnownStats.error || 0
          
          const newApplied = response.stats.applied - previousApplied
          const newSkipped = response.stats.skip - previousSkipped
          const newErrors = response.stats.error - previousError
          const totalAttempted = newApplied + newSkipped + newErrors
          
          // Only show summary if there was recent activity (within last hour)
          const runDate = new Date(lastRunTime)
          const now = new Date()
          const hoursSinceRun = (now.getTime() - runDate.getTime()) / (1000 * 60 * 60)
          
          if (hoursSinceRun < 1 && totalAttempted > 0) {
            const runPlatforms = Array.from(
              new Set(
                (response.activity || [])
                  .filter((item: any) => {
                    if (!item.timestamp) return false
                    const itemDate = new Date(item.timestamp)
                    return itemDate >= runDate
                  })
                  .map((item: any) => item.platform)
                  .filter(Boolean)
              )
            ) as string[]
            
            runSummary = {
              totalApplicationsAttempted: totalAttempted,
              totalApplied: newApplied,
              skippedCount: newSkipped,
              errorCount: newErrors,
              platforms: runPlatforms.length > 0 ? runPlatforms : undefined,
            }
          }
        }
        
        // Build config from available data (infer from activity, use defaults)
        const runConfig: RunConfig = {
          platforms: allPlatforms.length > 0 
            ? allPlatforms.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
            : ["Indeed", "Greenhouse", "Lever"], // Default fallback
          dailyCap: 20, // Default, could be fetched from profile API
        }
        
        const transformedData = {
          skippedOnboarding: (response as { skippedOnboarding?: boolean }).skippedOnboarding === true,
          compliance: {
            requiredApplications: compliance.required_applications || 10,
            completedApplications: compliance.applications_this_week || response.stats.applied || 0,
            overdueCount: compliance.missed_requirement ? compliance.required_applications - compliance.applications_this_week : 0,
            nextAppointment: null, // TODO: get from API
            periodLabel: "This week",
            weeklyStats,
          },
          upcomingTasks,
          recentActivity: (response.activity || []).map((item: any) => ({
            id: item.id,
            jobTitle: item.jobTitle || "Unknown",
            company: item.company || "Unknown",
            status: item.status === "applied" ? "submitted" : item.status === "skip" ? "pending" : item.status || "pending",
            submittedAt: item.timestamp,
            platform: item.platform,
            url: item.url,
            notes: item.notes,
            errorMessage: item.errorMessage,
            artifactUrl: item.artifactUrl,
          })),
          runStatus: {
            lastRunTime,
            applicationsLastRun: response.stats.applied || 0,
            status: runStatus,
          },
          runConfig,
          runSummary,
          discoverOnly,
          lastRunWasDiscoverOnly,
        }
        
        setData(transformedData)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load dashboard data"
        setError(errorMessage)
        // Show error toast
        showToast({
          title: "Unable to load dashboard",
          description: "We couldn't load your dashboard data. Please try refreshing the page.",
          variant: "error",
        })
      } finally {
        setIsLoading(false)
      }
  }, [
    showToast,
    isRunInProgress,
    runStartTime,
    lastKnownRunTime,
    lastKnownStats,
    currentRunIsDiscoverOnly,
    requireReview,
  ])

  // Detect onboarding-completed flag and show welcome banner once
  React.useEffect(() => {
    if (welcomeBannerCheckedRef.current) return
    welcomeBannerCheckedRef.current = true

    const fromQuery = searchParams.get("onboarding") === "completed"
    let fromStorage = false
    try {
      fromStorage = localStorage.getItem(WELCOME_BANNER_STORAGE_KEY) === "true"
    } catch {
      // ignore
    }
    
    if (fromQuery || fromStorage) {
      try {
        localStorage.removeItem(WELCOME_BANNER_STORAGE_KEY)
      } catch {
        // ignore
      }
      setShowWelcomeBanner(true)
      Promise.resolve(trackEvent({ event: "welcome_banner_shown" })).catch(() => {})
      
      // Only navigate if query param exists (to remove it from URL)
      if (fromQuery) {
        navigate("/app/dashboard", { replace: true })
      }
    }
  }, [navigate, searchParams])

  // Handle starting a run (optionally in discover-only mode)
  const handleStartRun = React.useCallback(
    async (forceDiscoverOnly?: boolean) => {
      if (isRunInProgress) return
      const discoverOnlyMode = forceDiscoverOnly ?? discoverOnly
      try {
        await startAutomationRun(discoverOnlyMode)
        const startTime = new Date().toISOString()
        setIsRunInProgress(true)
        setCurrentRunIsDiscoverOnly(discoverOnlyMode)
        setRunStartTime(startTime)
        setLastKnownRunTime(data?.runStatus?.lastRunTime || null)
        showToast({
          title: "Automation run started",
          description: "You can keep this page open while we work. We'll update you when it's done.",
          variant: "info",
        })
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
        }
        pollingIntervalRef.current = window.setInterval(() => {
          fetchData()
        }, 8000)
        const baseUrl = import.meta.env.VITE_API_BASE_URL || ""
        const streamUrl = `${baseUrl}/api/claimant/run-state/stream`
        try {
          const es = new EventSource(streamUrl)
          const onMessage = (ev: MessageEvent) => {
            try {
              const payload = JSON.parse(ev.data || "{}")
              const status = payload.status
              if (status === "completed" || status === "failed" || status === "timed_out" || status === "cancelled" || status === "idle") {
                es.close()
                setIsRunInProgress(false)
                fetchData()
              }
            } catch {
              // ignore parse errors
            }
          }
          es.onmessage = onMessage
          es.onerror = () => {
            es.close()
          }
        } catch {
          // SSE not supported or failed; polling will still run
        }
      } catch (err) {
        setIsRunInProgress(false)
        setRunStartTime(null)
        showToast({
          title: "Failed to start automation",
          description: err instanceof Error ? err.message : "Unable to start automation run. Please try again.",
          variant: "error",
        })
      }
    },
    [isRunInProgress, discoverOnly, data?.runStatus?.lastRunTime, fetchData, showToast]
  )

  React.useEffect(() => {
    fetchProfile()
    fetchData()
  }, [fetchData, fetchProfile])

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const handleWelcomeRunClick = React.useCallback(() => {
    Promise.resolve(trackEvent({ event: "welcome_run_clicked" })).catch(() => {})
    handleStartRun(true)
  }, [handleStartRun])

  const requiredApplications = data?.compliance?.requiredApplications
  const weeklyRequirementText =
    requiredApplications != null && requiredApplications > 0
      ? `Your work coach has set a target of ${requiredApplications} application${requiredApplications !== 1 ? "s" : ""} per week.`
      : "Your work coach will agree a weekly application target with you."

  return (
    <>
      {showWelcomeBanner && (
        <Card className="mb-6 border-jobflow/30 bg-jobflow/10">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
            <h2 className="text-lg font-semibold text-text-primary">Welcome to your job search dashboard</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Dismiss welcome banner"
              onClick={() => setShowWelcomeBanner(false)}
              className="h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-secondary">{weeklyRequirementText}</p>
            <p className="text-sm text-text-secondary">
              Today JobFlow suggests starting with a discovery run to find roles that match the profile you just set.
            </p>
            <Button
              onClick={handleWelcomeRunClick}
              disabled={isRunInProgress}
              className="w-full sm:w-auto"
            >
              {isRunInProgress ? "Run in progress…" : "Run my first discovery"}
            </Button>
            <p className="text-xs text-text-tertiary">
              You can change your settings any time under Settings.
            </p>
          </CardContent>
        </Card>
      )}
      <ClaimantDashboard
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={fetchData}
        isRunInProgress={isRunInProgress}
        onStartRun={() => handleStartRun()}
      />
    </>
  )
}

