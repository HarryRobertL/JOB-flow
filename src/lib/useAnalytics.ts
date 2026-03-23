/**
 * useAnalytics Hook
 * 
 * React hook for tracking analytics events in components.
 * Provides a clean, type-safe API for event tracking.
 */

import { useCallback, useEffect, useRef } from "react"
import {
  trackEvent,
  updateAnalyticsConfig,
  getSessionId,
  type AnalyticsEvent,
  type ClaimantPseudonym,
  type StaffId,
} from "./analytics"

/**
 * Hook options
 */
export interface UseAnalyticsOptions {
  /** Claimant pseudonym to attach to events */
  claimantId?: ClaimantPseudonym
  /** Staff ID to attach to events */
  staffId?: StaffId
  /** Track page views automatically */
  trackPageView?: boolean
  /** Page identifier for automatic page view tracking */
  pageIdentifier?: string
}

/**
 * Analytics hook return type
 */
export interface UseAnalyticsReturn {
  /** Track an analytics event */
  track: (event: Omit<AnalyticsEvent, "timestamp" | "sessionId">) => Promise<void>
  /** Get current session ID */
  getSessionId: () => string
}

/**
 * React hook for analytics tracking
 * 
 * @example
 * ```tsx
 * const { track } = useAnalytics({ claimantId: "user_123" })
 * 
 * const handleSearch = () => {
 *   track({
 *     event: "job_search_performed",
 *     platform: "indeed",
 *     easyApplyOnly: true,
 *     // ... other fields
 *   })
 * }
 * ```
 */
export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const { claimantId, staffId, trackPageView, pageIdentifier } = options
  const hasTrackedPageViewRef = useRef(false)

  // Update analytics config when claimant/staff IDs change
  useEffect(() => {
    if (claimantId || staffId) {
      updateAnalyticsConfig({
        claimantId,
        staffId,
      })
    }
  }, [claimantId, staffId])

  // Track page view on mount if enabled
  useEffect(() => {
    if (trackPageView && pageIdentifier && !hasTrackedPageViewRef.current) {
      hasTrackedPageViewRef.current = true
      trackEvent({
        event: "dashboard_viewed" as const,
        dashboardType: pageIdentifier as "claimant" | "work_coach" | "dwp",
      } as any)
    }
  }, [trackPageView, pageIdentifier])

  // Track time on page when component unmounts
  useEffect(() => {
    return () => {
      if (trackPageView && pageIdentifier && hasTrackedPageViewRef.current) {
        // Note: We could emit a page_leave event here, but keeping it simple for now
      }
    }
  }, [trackPageView, pageIdentifier])

  const track = useCallback(
    async (event: Omit<AnalyticsEvent, "timestamp" | "sessionId">) => {
      // Attach claimant/staff IDs if provided and not already in event
      const enrichedEvent: Omit<AnalyticsEvent, "timestamp" | "sessionId"> = {
        ...event,
        claimantId: event.claimantId || claimantId,
        staffId: event.staffId || staffId,
      }
      await trackEvent(enrichedEvent)
    },
    [claimantId, staffId]
  )

  return {
    track,
    getSessionId,
  }
}

