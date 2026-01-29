/**
 * ErrorState Component
 * 
 * Standardized error display component for network issues or backend failures.
 * Provides clear messaging and actionable next steps.
 */

import * as React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface ErrorStateProps {
  /** Error title */
  title?: string
  /** Error message */
  message: string
  /** Additional details about the error */
  details?: string
  /** Callback for retry action */
  onRetry?: () => void
  /** Whether the error is related to compliance logging */
  affectsCompliance?: boolean
  /** Additional className */
  className?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  details,
  onRetry,
  affectsCompliance = false,
  className,
}) => {
  return (
    <Card className={cn("border-error-200 bg-error-50", className)} role="alert" aria-live="assertive">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-error-600" aria-hidden="true" />
          <CardTitle className="text-error-900">{title}</CardTitle>
        </div>
        {affectsCompliance && (
          <CardDescription className="text-error-700">
            This error may affect compliance logging. Please review your activity log.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-error-800">{message}</p>
        
        {details && (
          <div className="rounded-md bg-error-100 p-3" role="region" aria-label="Error details">
            <p className="text-xs text-error-700 font-mono">{details}</p>
          </div>
        )}

        {affectsCompliance && (
          <div className="rounded-md bg-warning-50 border border-warning-200 p-3" role="status" aria-live="polite">
            <p className="text-xs text-warning-800">
              <strong>Important:</strong> If you were submitting applications when this error occurred,
              they may not have been logged. Please check your compliance log and contact your work
              coach if you need to update your records.
            </p>
          </div>
        )}

        {onRetry && (
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={onRetry}
              className="bg-error-600 hover:bg-error-700"
              aria-label="Try again to resolve the error"
              data-testid="error-retry-button"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        )}

        <div className="text-xs text-error-700">
          <p>If this problem persists, please:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check your internet connection</li>
            <li>Refresh the page</li>
            <li>Contact support if the issue continues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

