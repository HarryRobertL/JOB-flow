/**
 * Auth Context
 *
 * Provides authentication state and functions for the entire app.
 * Uses React Context API to store user session information.
 * For claimants, hasCompletedOnboarding is derived from profile data when available.
 */

import * as React from "react"
import { apiPost, apiGet, getClaimantProfile } from "@/lib/apiClient"
import type { ClaimantProfileResponse } from "@/types/onboarding"

export type Role = "claimant" | "coach" | "admin"

export interface User {
  id: string
  email: string
  role: Role
  display_name?: string | null
  /** For claimants: true if profile has been completed; undefined until checked. Staff ignore. */
  hasCompletedOnboarding?: boolean
}

export function isProfileComplete(profile: ClaimantProfileResponse | null): boolean {
  if (!profile || typeof profile !== "object") return false
  if (profile.skippedOnboarding === true) return true
  const fn = profile.firstName ?? profile.first_name
  const em = profile.email
  return typeof fn === "string" && !!fn.trim() && typeof em === "string" && !!em.trim()
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  /** Call after claimant completes onboarding so route guards see completed profile. */
  setClaimantOnboardingComplete: () => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const checkAuth = React.useCallback(async () => {
    try {
      const response = (await apiGet<{ user: User }>("/auth/me")) as { user: User }
      if (response && response.user) {
        const u = response.user
        if (u.role === "claimant") {
          const profile = await getClaimantProfile()
          setUser({ ...u, hasCompletedOnboarding: isProfileComplete(profile) })
        } else {
          setUser(u)
        }
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = React.useCallback(async (email: string, password: string) => {
    const response = (await apiPost<{ user: User }>("/auth/login", {
      email,
      password,
    })) as { user: User }
    if (!response?.user) throw new Error("Login failed: Invalid response")
    const u = response.user
    if (u.role === "claimant") {
      const profile = await getClaimantProfile()
      setUser({ ...u, hasCompletedOnboarding: isProfileComplete(profile) })
    } else {
      setUser(u)
    }
  }, [])

  const logout = React.useCallback(async () => {
    try {
      await apiPost("/auth/logout", {})
    } catch {
      // ignore
    } finally {
      setUser(null)
    }
  }, [])

  const setClaimantOnboardingComplete = React.useCallback(() => {
    setUser((prev) =>
      prev && prev.role === "claimant" ? { ...prev, hasCompletedOnboarding: true } : prev
    )
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    checkAuth,
    setClaimantOnboardingComplete,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

