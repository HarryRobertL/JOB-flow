/**
 * Badge Component
 * 
 * shadcn UI compatible badge component for JobFlow.
 * Provides accessible, styled badges for status indicators and labels.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline"
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          {
            "bg-primary-100 text-primary-800": variant === "default",
            "bg-success-100 text-success-800": variant === "success",
            "bg-warning-100 text-warning-800": variant === "warning",
            "bg-error-100 text-error-800": variant === "error",
            "bg-info-100 text-info-800": variant === "info",
            "border border-neutral-300 bg-transparent text-neutral-700": variant === "outline",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }

