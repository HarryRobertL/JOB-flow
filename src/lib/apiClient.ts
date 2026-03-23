/**
 * API Client
 * 
 * Utility for making authenticated API requests to the FastAPI backend.
 * Automatically handles cookies for session-based auth.
 */

import type { ClaimantProfileResponse, ProfileUpdatePayload } from "@/types/onboarding"

export interface ApiError {
  detail: string
}

/**
 * Check if an error is due to offline status
 */
export function isOfflineError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors typically indicate offline
    const message = error.message.toLowerCase()
    return (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("network error") ||
      message.includes("load failed") ||
      // Check navigator.onLine as well
      (typeof navigator !== "undefined" && !navigator.onLine)
    )
  }
  // Also check navigator.onLine for non-Error cases
  return typeof navigator !== "undefined" && !navigator.onLine
}

/**
 * Make an authenticated API request.
 * Cookies are automatically included by the browser.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Use empty string for same-origin requests (cookies will work)
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ""
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${normalizedEndpoint}`

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      credentials: "include", // Include cookies
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })
  } catch (fetchError) {
    // Network errors (offline, CORS, etc.) are caught here
    if (isOfflineError(fetchError)) {
      throw new Error("You are offline. Please check your internet connection.")
    }
    throw fetchError
  }

  if (!response.ok) {
    let errorDetail = "An error occurred"
    try {
      const errorData = (await response.json()) as ApiError
      errorDetail = errorData.detail || errorDetail
    } catch {
      errorDetail = response.statusText || errorDetail
    }
    throw new Error(errorDetail)
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type")
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T
  }
  
  return undefined as T
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET" })
}

/**
 * POST request helper
 */
export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT request helper
 */
export async function apiPut<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "DELETE" })
}

/**
 * Fetch claimant profile if endpoint exists.
 * Returns null on 404 or when not implemented.
 */
export async function getClaimantProfile(): Promise<ClaimantProfileResponse | null> {
  try {
    const data = await apiGet<ClaimantProfileResponse>("/api/claimant/profile")
    return data
  } catch {
    return null
  }
}

/**
 * Save claimant profile (creates/updates backend config as available).
 */
export async function updateClaimantProfile(
  payload: ProfileUpdatePayload
): Promise<{ status: string; message?: string }> {
  return apiPut<{ status: string; message?: string }>("/api/claimant/profile", payload)
}

/**
 * Start automation run
 * Triggers the JobFlow engine in a background thread.
 */
export interface RunResponse {
  status: "started" | "error"
  message?: string
  run_id?: string
  started_at?: string
}

export async function startAutomationRun(discoverOnly?: boolean): Promise<RunResponse> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ""
  const url = `${baseUrl}/run${discoverOnly ? "?discover_only=true" : ""}`

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (response.status >= 200 && response.status < 400) {
    try {
      const data = (await response.json()) as { run_id?: string; status?: string; started_at?: string }
      return {
        status: "started",
        message: "Automation run started successfully",
        run_id: data.run_id,
        started_at: data.started_at,
      }
    } catch {
      // Backward compatibility for environments still returning non-JSON
    }
    return {
      status: "started",
      message: "Automation run started successfully",
    }
  }

  let errorDetail = "Failed to start automation run"
  try {
    const errorData = (await response.json()) as ApiError
    errorDetail = errorData.detail || errorDetail
  } catch {
    errorDetail = response.statusText || errorDetail
  }

  throw new Error(errorDetail)
}

