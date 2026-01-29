/**
 * PageHeader Component
 * 
 * Standardized page header component for consistent title and description styling
 * across all pages.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  /** Page title */
  title: string
  /** Optional page description */
  description?: string
  /** Optional action buttons */
  actions?: React.ReactNode
  /** Optional className */
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => {
  return (
    <header className={cn("space-y-2", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-text-secondary">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </header>
  )
}

