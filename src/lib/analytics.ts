/**
 * Analytics Module
 * 
 * Central analytics module for tracking user behavior and compliance-relevant events.
 * Designed to be privacy-safe (no PII), extensible, and test-friendly.
 * 
 * Features:
 * - Privacy-safe event tracking (counts and metadata only, no PII)
 * - Debug mode for development
 * - Extensible dispatcher pattern (can be wired to real providers later)
 * - Type-safe event schema
 */

/**
 * Pseudonymized identifier for claimants (hash or UUID, never raw email/name)
 */
export type ClaimantPseudonym = string

/**
 * Staff identifier (for work coach and DWP dashboards)
 */
export type StaffId = string

/**
 * Base event properties shared across all events
 */
export interface BaseEvent {
  /** Event type identifier */
  event: string
  /** ISO 8601 timestamp */
  timestamp: string
  /** Claimant pseudonym (hashed identifier, never PII) */
  claimantId?: ClaimantPseudonym
  /** Staff identifier (for staff dashboard events) */
  staffId?: StaffId
  /** Session identifier */
  sessionId?: string
  /** User agent (sanitized, no full fingerprinting) */
  userAgent?: string
}

/**
 * Onboarding completed event
 */
export interface OnboardingCompletedEvent extends BaseEvent {
  event: "onboarding_completed"
  /** Number of steps completed */
  totalSteps: number
  /** Time to complete (in seconds) */
  durationSeconds?: number
  /** Whether auto-apply is enabled */
  autoApplyEnabled: boolean
  /** Whether review is required */
  requireReview: boolean
  /** Number of job types selected */
  jobTypesCount: number
  /** Whether daily cap is set */
  hasDailyCap: boolean
}

/**
 * Onboarding step completed event
 */
export interface OnboardingStepCompletedEvent extends BaseEvent {
  event: "onboarding_step_completed"
  /** Step identifier */
  step: "about" | "experience" | "preferences" | "automation" | "review"
}

/**
 * Job search performed event
 */
export interface JobSearchPerformedEvent extends BaseEvent {
  event: "job_search_performed"
  /** Platform searched (indeed, greenhouse, lever, all) */
  platform: string
  /** Whether easy apply only filter is enabled */
  easyApplyOnly: boolean
  /** Remote preference (any, remote, hybrid, onsite) */
  remotePreference: string
  /** Search radius in km */
  radiusKm: number
  /** Whether salary filter is set */
  hasSalaryFilter: boolean
  /** Whether auto-apply is enabled */
  autoApplyEnabled: boolean
  /** Number of results found (if available) */
  resultsCount?: number
}

/**
 * Application submitted event
 */
export interface ApplicationSubmittedEvent extends BaseEvent {
  event: "application_submitted"
  /** Number of applications in the batch */
  batchSize: number
  /** Platform(s) used (comma-separated if multiple) */
  platforms: string[]
  /** Whether this was auto-applied */
  isAutoApply: boolean
  /** Whether this required manual review */
  requiredReview: boolean
  /** Number of distinct job types */
  jobTypesCount: number
}

/**
 * Log exported event
 */
export interface LogExportedEvent extends BaseEvent {
  event: "log_exported"
  /** Export format (csv, json) */
  format: "csv" | "json"
  /** Whether date range filter was applied */
  hasDateRange: boolean
  /** Start date if filtered (ISO date string, no time) */
  startDate?: string
  /** End date if filtered (ISO date string, no time) */
  endDate?: string
  /** Share method if shared (email, link) */
  shareMethod?: "email" | "link"
}

/**
 * Dashboard viewed event
 */
export interface DashboardViewedEvent extends BaseEvent {
  event: "dashboard_viewed"
  /** Dashboard type (claimant, work_coach, dwp) */
  dashboardType: "claimant" | "work_coach" | "dwp"
  /** Time on page (in seconds, if available) */
  timeOnPageSeconds?: number
}

/**
 * Landing page viewed event
 */
export interface LandingPageViewedEvent extends BaseEvent {
  event: "landing_page_viewed"
}

/**
 * Landing viewed event (first-run experience)
 */
export interface LandingViewedEvent extends BaseEvent {
  event: "landing_viewed"
}

/**
 * Landing CTA clicked event
 */
export interface LandingCtaClickedEvent extends BaseEvent {
  event: "landing_cta_clicked"
  /** Role the user is signing in as or interested in */
  role: "claimant" | "coach" | "admin" | "unknown"
  /** Optional CTA identifier */
  cta?: string
}

/**
 * Login redirect event
 */
export interface LoginRedirectEvent extends BaseEvent {
  event: "login_redirect"
  /** User role */
  role: "claimant" | "coach" | "admin"
  /** Path the user was redirected to */
  targetPath: string
  /** For claimants, whether onboarding was completed (omit for staff) */
  hasCompletedOnboarding?: boolean
}

/**
 * Job approved for auto-apply event
 */
export interface JobApprovedForAutoApplyEvent extends BaseEvent {
  event: "job_approved_for_auto_apply"
  /** Number of jobs approved */
  batchSize: number
  /** Platform(s) used (comma-separated if multiple) */
  platforms: string[]
  /** Whether this was auto-applied */
  isAutoApply: boolean
  /** Whether this required manual review */
  requiredReview: boolean
  /** Number of distinct job types */
  jobTypesCount: number
}

/**
 * Job application submitted event (alias for application_submitted for consistency)
 */
export interface JobApplicationSubmittedEvent extends BaseEvent {
  event: "job_application_submitted"
  /** Number of applications in the batch */
  batchSize: number
  /** Platform(s) used (comma-separated if multiple) */
  platforms: string[]
  /** Whether this was auto-applied */
  isAutoApply: boolean
  /** Whether this required manual review */
  requiredReview: boolean
  /** Number of distinct job types */
  jobTypesCount: number
}

/**
 * Coach claimant viewed event
 */
export interface CoachClaimantViewedEvent extends BaseEvent {
  event: "coach_claimant_viewed"
  /** Claimant ID being viewed */
  claimantId: string
  /** Whether detail view was opened */
  isDetailView: boolean
}

/**
 * Export report downloaded event
 */
export interface ExportReportDownloadedEvent extends BaseEvent {
  event: "export_report_downloaded"
  /** Export format (csv, json, pdf) */
  format: "csv" | "json" | "pdf"
  /** Whether date range filter was applied */
  hasDateRange: boolean
  /** Start date if filtered (ISO date string, no time) */
  startDate?: string
  /** End date if filtered (ISO date string, no time) */
  endDate?: string
  /** Report type (compliance, evidence, activity) */
  reportType?: string
}

/**
 * Run completed event
 */
export interface RunCompletedEvent extends BaseEvent {
  event: "run_completed"
  /** Total applications attempted */
  totalApplicationsAttempted: number
  /** Number of applications successfully applied */
  totalApplied: number
  /** Number of applications skipped */
  skippedCount: number
  /** Number of applications with errors */
  errorCount: number
  /** Main platforms used (comma-separated) */
  platforms: string
}

/**
 * Welcome banner shown (after onboarding)
 */
export interface WelcomeBannerShownEvent extends BaseEvent {
  event: "welcome_banner_shown"
}

/**
 * Welcome banner "Run my first discovery" clicked
 */
export interface WelcomeRunClickedEvent extends BaseEvent {
  event: "welcome_run_clicked"
}

/**
 * Union type of all analytics events
 */
export type AnalyticsEvent =
  | OnboardingCompletedEvent
  | OnboardingStepCompletedEvent
  | JobSearchPerformedEvent
  | ApplicationSubmittedEvent
  | JobApplicationSubmittedEvent
  | LogExportedEvent
  | DashboardViewedEvent
  | LandingPageViewedEvent
  | LandingViewedEvent
  | LandingCtaClickedEvent
  | LoginRedirectEvent
  | JobApprovedForAutoApplyEvent
  | CoachClaimantViewedEvent
  | ExportReportDownloadedEvent
  | RunCompletedEvent
  | WelcomeBannerShownEvent
  | WelcomeRunClickedEvent

/**
 * Analytics dispatcher interface
 * Can be implemented by various providers (console, API, third-party analytics)
 */
export interface AnalyticsDispatcher {
  dispatch(event: AnalyticsEvent): void | Promise<void>
}

/**
 * Console dispatcher for development/debug mode
 */
class ConsoleDispatcher implements AnalyticsDispatcher {
  dispatch(event: AnalyticsEvent): void {
    const timestamp = new Date(event.timestamp).toLocaleString()
    console.group(`[Analytics] ${event.event} @ ${timestamp}`)
    console.log("Event:", event)
    console.log("Payload:", JSON.stringify(event, null, 2))
    console.groupEnd()
  }
}

/**
 * Queue dispatcher (stores events in localStorage when offline)
 * 
 * For non-critical analytics events, we queue them when offline and flush
 * when connection is restored. This ensures analytics data is not lost
 * during temporary connectivity issues.
 */
class QueueDispatcher implements AnalyticsDispatcher {
  private readonly STORAGE_KEY = "analytics_queue"
  private readonly MAX_QUEUE_SIZE = 100 // Prevent localStorage from growing too large

  dispatch(event: AnalyticsEvent): void {
    try {
      const queue = this.getQueue()
      
      // Prevent queue from growing too large
      if (queue.length >= this.MAX_QUEUE_SIZE) {
        // Remove oldest events
        queue.shift()
      }
      
      queue.push(event)
      this.saveQueue(queue)
    } catch (error) {
      // Silently fail if localStorage is unavailable (private browsing, quota exceeded)
      if (import.meta.env.DEV) {
        console.warn("[Analytics] Failed to queue event:", error)
      }
    }
  }

  /**
   * Get queued events from localStorage
   */
  getQueue(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      return JSON.parse(stored) as AnalyticsEvent[]
    } catch {
      return []
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(queue: AnalyticsEvent[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue))
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[Analytics] Failed to save queue:", error)
      }
    }
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch {
      // Ignore errors when clearing
    }
  }

  /**
   * Flush queued events to the API
   */
  async flushQueue(apiEndpoint: string): Promise<void> {
    const queue = this.getQueue()
    if (queue.length === 0) return

    const eventsToSend = [...queue]
    this.clearQueue()

    // Send events sequentially to avoid overwhelming the server
    for (const event of eventsToSend) {
      try {
        await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        })
      } catch (error) {
        // If sending fails, re-queue the remaining events
        const remainingEvents = eventsToSend.slice(eventsToSend.indexOf(event))
        const currentQueue = this.getQueue()
        this.saveQueue([...currentQueue, ...remainingEvents])
        break
      }
    }
  }
}

/**
 * API dispatcher (sends events to backend endpoint)
 * 
 * When offline, events are queued in localStorage and flushed when connection
 * is restored. This ensures analytics data is not lost during temporary
 * connectivity issues.
 */
class ApiDispatcher implements AnalyticsDispatcher {
  private endpoint: string
  private queueDispatcher: QueueDispatcher

  constructor(endpoint: string = "/api/analytics") {
    this.endpoint = endpoint
    this.queueDispatcher = new QueueDispatcher()
  }

  async dispatch(event: AnalyticsEvent): Promise<void> {
    // Check if we're online
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true

    if (!isOnline) {
      // Queue the event for later
      this.queueDispatcher.dispatch(event)
      return
    }

    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      })
    } catch (error) {
      // If fetch fails (network error), queue the event
      // This handles cases where navigator.onLine is true but network is actually down
      this.queueDispatcher.dispatch(event)
      
      // Silently fail in production, but log in development
      if (import.meta.env.DEV) {
        console.error("[Analytics] Failed to dispatch event, queued for retry:", error)
      }
    }
  }

  /**
   * Flush queued events (called when connection is restored)
   */
  async flushQueue(): Promise<void> {
    await this.queueDispatcher.flushQueue(this.endpoint)
  }
}

/**
 * Null dispatcher (for testing or when analytics is disabled)
 */
class NullDispatcher implements AnalyticsDispatcher {
  dispatch(_event: AnalyticsEvent): void {
    // No-op
  }
}

/**
 * Analytics configuration
 */
interface AnalyticsConfig {
  /** Enable debug mode (console logging) */
  debug?: boolean
  /** API endpoint for analytics events */
  apiEndpoint?: string
  /** Current session ID */
  sessionId?: string
  /** Current claimant pseudonym */
  claimantId?: ClaimantPseudonym
  /** Current staff ID */
  staffId?: StaffId
}

/**
 * Analytics service class
 */
class AnalyticsService {
  private dispatchers: AnalyticsDispatcher[] = []
  private config: AnalyticsConfig = {}
  private sessionId: string
  private apiDispatcher: ApiDispatcher | null = null

  constructor(config: AnalyticsConfig = {}) {
    this.config = config
    this.sessionId = config.sessionId || this.generateSessionId()

    // Setup dispatchers based on config
    if (config.debug || import.meta.env.DEV) {
      this.dispatchers.push(new ConsoleDispatcher())
    }

    if (config.apiEndpoint) {
      this.apiDispatcher = new ApiDispatcher(config.apiEndpoint)
      this.dispatchers.push(this.apiDispatcher)
    }

    // Default to console dispatcher if none configured
    if (this.dispatchers.length === 0) {
      this.dispatchers.push(
        import.meta.env.DEV ? new ConsoleDispatcher() : new NullDispatcher()
      )
    }

    // Listen for online event to flush queued events
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.flushQueue()
      })
    }
  }

  /**
   * Flush queued analytics events when connection is restored
   */
  private async flushQueue(): Promise<void> {
    if (this.apiDispatcher) {
      await this.apiDispatcher.flushQueue()
    }
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config }
    if (config.sessionId) {
      this.sessionId = config.sessionId
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Dispatch an analytics event
   */
  async track(event: Omit<AnalyticsEvent, "timestamp" | "sessionId"> | Partial<AnalyticsEvent>): Promise<void> {
    const enrichedEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      claimantId: event.claimantId || this.config.claimantId,
      staffId: event.staffId || this.config.staffId,
      userAgent: this.getSanitizedUserAgent(),
    } as AnalyticsEvent

    // Dispatch to all configured dispatchers
    await Promise.all(
      this.dispatchers.map((dispatcher) => dispatcher.dispatch(enrichedEvent))
    )
  }

  /**
   * Get sanitized user agent (just browser family, not full fingerprint)
   */
  private getSanitizedUserAgent(): string {
    if (typeof navigator === "undefined") return "unknown"
    const ua = navigator.userAgent
    if (ua.includes("Chrome")) return "chrome"
    if (ua.includes("Firefox")) return "firefox"
    if (ua.includes("Safari")) return "safari"
    if (ua.includes("Edge")) return "edge"
    return "other"
  }
}

// Global analytics service instance
let analyticsService: AnalyticsService | null = null

/**
 * Initialize the analytics service
 */
export function initAnalytics(config: AnalyticsConfig = {}): void {
  analyticsService = new AnalyticsService({
    debug: import.meta.env.DEV,
    // Default to API endpoint in production, console in dev
    apiEndpoint: config.apiEndpoint ?? (!import.meta.env.DEV ? "/api/analytics" : undefined),
    ...config,
  })
}

/**
 * Get the analytics service instance
 */
function getAnalytics(): AnalyticsService {
  if (!analyticsService) {
    analyticsService = new AnalyticsService({
      debug: import.meta.env.DEV,
      // Default to API endpoint in production, console in dev
      apiEndpoint: !import.meta.env.DEV ? "/api/analytics" : undefined,
    })
  }
  return analyticsService
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  event: Omit<AnalyticsEvent, "timestamp" | "sessionId">
): Promise<void> {
  await getAnalytics().track(event)
}

/**
 * Update analytics configuration
 */
export function updateAnalyticsConfig(config: Partial<AnalyticsConfig>): void {
  getAnalytics().updateConfig(config)
}

/**
 * Get current session ID
 */
export function getSessionId(): string {
  return getAnalytics().getSessionId()
}

// Initialize analytics on module load
initAnalytics()

