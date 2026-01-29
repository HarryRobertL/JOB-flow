/**
 * EmptyState Component
 * 
 * Standardized empty state component for when lists or data are empty.
 */

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  /** Title text */
  title?: string
  /** Description text */
  description?: string
  /** Optional icon */
  icon?: React.ReactNode
  /** Optional action button */
  action?: React.ReactNode
  /** Optional className */
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No items found",
  description = "Try adjusting your filters or check back later.",
  icon,
  action,
  className,
}) => {
  return (
    <Card className={cn("border-border-default bg-surface-DEFAULT", className)}>
      <CardContent className="pt-6">
        <div className="text-center py-8">
          {icon && (
            <div className="flex justify-center mb-4" aria-hidden="true">
              {icon}
            </div>
          )}
          <p className="text-sm font-medium text-text-primary">{title}</p>
          {description && (
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          )}
          {action && (
            <div className="mt-4 flex justify-center">{action}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

