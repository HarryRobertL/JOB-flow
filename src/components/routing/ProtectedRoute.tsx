/**
 * ProtectedRoute Component
 *
 * Route guard that ensures user is authenticated and has required role.
 * For claimants, redirects to /app/onboarding if profile is not completed,
 * unless the route is /app/onboarding itself (avoids loops).
 */

import * as React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import type { Role } from "@/contexts/AuthContext"

export interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: Role[]
  redirectTo?: string
}

const ONBOARDING_PATH = "/app/onboarding"

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bgBody">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jobflow mx-auto" aria-hidden />
          <p className="mt-4 text-sm text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  if (
    user.role === "claimant" &&
    user.hasCompletedOnboarding === false &&
    pathname.startsWith("/app/") &&
    pathname !== ONBOARDING_PATH
  ) {
    return <Navigate to={ONBOARDING_PATH} replace />
  }

  return <>{children}</>
}

