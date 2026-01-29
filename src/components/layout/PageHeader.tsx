/**
 * PageHeader Component
 * 
 * Consistent page header component for all dashboard pages.
 * Provides page title, subtitle, and optional actions.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  /** Main page title */
  title: string
  /** Optional subtitle or description */
  subtitle?: string
  /** Optional helper text */
  helperText?: string
  /** Optional action buttons or elements */
  actions?: React.ReactNode
  /** Additional className */
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  helperText,
  actions,
  className,
}) => {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-text-primary tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-base text-text-secondary">
              {subtitle}
            </p>
          )}
          {helperText && (
            <p className="mt-1 text-sm text-text-tertiary">
              {helperText}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-start gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

