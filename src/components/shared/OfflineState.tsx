/**
 * OfflineState Component
 * 
 * Component to display when the application is offline or has connectivity issues.
 * Provides clear feedback and reconnection status.
 */

import * as React from "react"
import { WifiOff, Wifi, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface OfflineStateProps {
  /** Whether the app is currently offline */
  isOffline: boolean
  /** Callback to retry connection */
  onRetry?: () => void
  /** Additional className */
  className?: string
}

export const OfflineState: React.FC<OfflineStateProps> = ({
  isOffline,
  onRetry,
  className,
}) => {
  const [isReconnecting, setIsReconnecting] = React.useState(false)

  React.useEffect(() => {
    if (!isOffline && isReconnecting) {
      setIsReconnecting(false)
    }
  }, [isOffline, isReconnecting])

  const handleRetry = () => {
    setIsReconnecting(true)
    onRetry?.()
    
    // Reset reconnecting state after a delay
    setTimeout(() => {
      setIsReconnecting(false)
    }, 2000)
  }

  if (!isOffline) {
    return null
  }

  return (
    <Card className={cn("border-warning-200 bg-warning-50", className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {isReconnecting ? (
            <Wifi className="h-6 w-6 text-warning-600 animate-pulse" aria-hidden="true" />
          ) : (
            <WifiOff className="h-6 w-6 text-warning-600" aria-hidden="true" />
          )}
          <CardTitle className="text-warning-900">
            {isReconnecting ? "Reconnecting..." : "You're offline"}
          </CardTitle>
        </div>
        <CardDescription className="text-warning-700">
          {isReconnecting
            ? "Attempting to restore connection..."
            : "No internet connection detected"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-md bg-warning-100 p-3">
          <AlertCircle className="h-5 w-5 text-warning-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-warning-800">
              <strong>Limited functionality:</strong> Some features may not work while offline.
              Your data will be saved locally and synced when connection is restored.
            </p>
          </div>
        </div>

        <div className="text-xs text-warning-700 space-y-2">
          <p><strong>What you can do:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>View previously loaded data</li>
            <li>Review your application history</li>
            <li>Check your compliance status</li>
          </ul>
          <p className="mt-2"><strong>What won't work:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Submitting new applications</li>
            <li>Updating your profile</li>
            <li>Syncing with the server</li>
          </ul>
        </div>

        {onRetry && (
          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={isReconnecting}
            className="border-warning-300 text-warning-900 hover:bg-warning-100"
          >
            {isReconnecting ? (
              <>
                <Wifi className="mr-2 h-4 w-4 animate-pulse" />
                Reconnecting...
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" />
                Check connection
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

