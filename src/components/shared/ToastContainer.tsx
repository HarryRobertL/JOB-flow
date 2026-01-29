/**
 * ToastContainer Component
 * 
 * Container for displaying toast notifications.
 * Uses design system colors and shadcn Card component.
 */

import * as React from "react"
import { useToast } from "@/contexts/ToastContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  const getVariantStyles = (variant: "success" | "error" | "info") => {
    switch (variant) {
      case "success":
        return "border-success-200 bg-success-50"
      case "error":
        return "border-error-200 bg-error-50"
      case "info":
        return "border-info-200 bg-info-50"
    }
  }

  const getIcon = (variant: "success" | "error" | "info") => {
    switch (variant) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-success-600" aria-hidden="true" />
      case "error":
        return <XCircle className="h-5 w-5 text-error-600" aria-hidden="true" />
      case "info":
        return <Info className="h-5 w-5 text-info-600" aria-hidden="true" />
    }
  }

  const getTextColor = (variant: "success" | "error" | "info") => {
    switch (variant) {
      case "success":
        return "text-success-900"
      case "error":
        return "text-error-900"
      case "info":
        return "text-info-900"
    }
  }

  return (
    <div
      className="fixed top-4 right-4 z-modal flex flex-col gap-2 max-w-md w-full sm:max-w-sm"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Card
          key={toast.id}
          className={cn(
            "shadow-lg border-2 transition-all duration-300 animate-in slide-in-from-right",
            getVariantStyles(toast.variant)
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getIcon(toast.variant)}</div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", getTextColor(toast.variant))}>
                  {toast.title}
                </p>
                {toast.description && (
                  <p className={cn("mt-1 text-sm", getTextColor(toast.variant), "opacity-80")}>
                    {toast.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeToast(toast.id)}
                className="h-6 w-6 flex-shrink-0 opacity-70 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
