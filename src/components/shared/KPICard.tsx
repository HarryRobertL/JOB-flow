/**
 * KPICard Component
 * 
 * Reusable KPI card component for displaying key metrics.
 * Used in both work coach and DWP regional dashboards.
 */

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface KPICardProps {
  /** KPI title */
  title: string
  /** Main value to display */
  value: string | number
  /** Optional description or context */
  description?: string
  /** Optional trend indicator */
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  /** Optional icon */
  icon?: React.ReactNode
  /** Variant for styling */
  variant?: "default" | "success" | "warning" | "error" | "info"
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  description,
  trend,
  icon,
  variant = "default",
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-success-200 bg-success-50"
      case "warning":
        return "border-warning-200 bg-warning-50"
      case "error":
        return "border-error-200 bg-error-50"
      case "info":
        return "border-info-200 bg-info-50"
      default:
        return "border-border-default bg-surface-DEFAULT"
    }
  }

  const formatValue = (val: string | number): string => {
    if (typeof val === "number") {
      // Format large numbers with commas
      return val.toLocaleString("en-GB")
    }
    return val
  }

  return (
    <Card className={cn(getVariantStyles())} role="article" aria-label={`${title}: ${formatValue(value)}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">{title}</CardTitle>
        {icon && <div className="text-neutral-500" aria-hidden="true">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-text-primary" aria-live="polite" aria-atomic="true">
          {formatValue(value)}
        </div>
        {description && (
          <p className="text-xs text-text-tertiary mt-1">{description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs" role="status" aria-label={`Trend: ${trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'no change'} ${Math.abs(trend.value)}% ${trend.label}`}>
            {trend.value > 0 ? (
              <TrendingUp className="h-3 w-3 text-success-600" aria-hidden="true" />
            ) : trend.value < 0 ? (
              <TrendingDown className="h-3 w-3 text-error-600" aria-hidden="true" />
            ) : (
              <Minus className="h-3 w-3 text-neutral-500" aria-hidden="true" />
            )}
            <span
              className={cn(
                "font-medium",
                trend.value > 0 && "text-success-600",
                trend.value < 0 && "text-error-600",
                trend.value === 0 && "text-neutral-500"
              )}
            >
              {Math.abs(trend.value)}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

