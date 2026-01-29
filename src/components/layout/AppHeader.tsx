/**
 * AppHeader Component
 * 
 * Consistent header component for all app shells.
 * Provides app branding, role label, user menu, and optional environment badge.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogOut, User } from "lucide-react"

export interface AppHeaderProps {
  /** User display name */
  userName?: string
  /** User email */
  userEmail?: string
  /** User role for displaying role label */
  role?: "claimant" | "coach" | "admin"
  /** Optional environment badge (e.g., "Pilot") */
  environmentBadge?: string
  /** Logout handler */
  onLogout?: () => void
  /** Additional className */
  className?: string
}

const getRoleLabel = (role?: "claimant" | "coach" | "admin"): string => {
  switch (role) {
    case "claimant":
      return "Claimant"
    case "coach":
      return "Work coach"
    case "admin":
      return "DWP admin"
    default:
      return ""
  }
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  userName,
  userEmail,
  role,
  environmentBadge,
  onLogout,
  className,
}) => {
  const displayName = userName || userEmail || "User"
  const roleLabel = getRoleLabel(role)

  return (
    <header
      className={cn(
        "sticky top-0 z-sticky flex h-16 items-center justify-between",
        "border-b border-borderSubtle bg-bgLayer2 px-4 lg:px-6 shadow-sm",
        className
      )}
      role="banner"
    >
      <div className="flex items-center gap-4">
        {/* Product name with logo */}
        <div className="flex items-center gap-2">
          <img
            src="/logo-logo.png"
            alt="JobFlow"
            className="h-7 w-7 object-contain"
          />
        </div>
        {/* Role label */}
        {roleLabel && (
          <span className="hidden text-sm text-text-secondary sm:inline" aria-label={`Role: ${roleLabel}`}>
            {roleLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Environment badge (e.g., "Pilot") */}
        {environmentBadge && (
          <Badge variant="info" className="text-xs">
            {environmentBadge}
          </Badge>
        )}

        {/* User menu */}
        {displayName && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bgLayer2 border border-borderSubtle">
              <div className="h-7 w-7 rounded-full bg-jobflow/20 flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-jobflow" />
              </div>
              <div className="flex flex-col">
                {userName && (
                  <span className="text-xs font-medium text-text-primary leading-tight">
                    {userName}
                  </span>
                )}
                {userEmail && (
                  <span className="text-xs text-text-tertiary leading-tight">
                    {userEmail}
                  </span>
                )}
              </div>
            </div>
            {onLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="flex items-center gap-2"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

