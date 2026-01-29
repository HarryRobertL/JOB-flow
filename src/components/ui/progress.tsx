/**
 * Progress Component
 * 
 * shadcn UI compatible progress component for JobFlow.
 * Provides accessible progress indicators for completion tracking.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  variant?: "default" | "success" | "warning" | "error"
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = "default", ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-neutral-200",
          className
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Progress: ${Math.round(percentage)}%`}
        {...props}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 ease-in-out",
            {
              "bg-primary-500": variant === "default",
              "bg-success-500": variant === "success",
              "bg-warning-500": variant === "warning",
              "bg-error-500": variant === "error",
            }
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }

