/**
 * OfflineBanner Component
 * 
 * Subtle banner that appears when the user is offline.
 * Provides clear, calm messaging about connectivity status.
 */

import * as React from "react"
import { WifiOff, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface OfflineBannerProps {
  /** Whether the app is currently offline */
  isOffline: boolean
  /** Callback to dismiss the banner (optional) */
  onDismiss?: () => void
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  onDismiss,
}) => {
  const [isDismissed, setIsDismissed] = React.useState(false)

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (!isOffline || isDismissed) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[1040]",
        "bg-warning-50 border-b border-warning-200",
        "px-4 py-3",
        "flex items-center justify-between gap-4",
        "animate-in slide-in-from-top duration-300"
      )}
      role="banner"
      aria-live="polite"
      aria-label="Offline status"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <WifiOff className="h-5 w-5 text-warning-700 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-warning-900">
          <strong>You are offline.</strong> Some features are unavailable. We will sync again when you are back online.
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className={cn(
            "p-1 text-warning-600 hover:text-warning-900",
            "focus:outline-none focus:ring-2 focus:ring-warning-500 focus:ring-offset-2 rounded",
            "transition-colors flex-shrink-0"
          )}
          aria-label="Dismiss offline banner"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
