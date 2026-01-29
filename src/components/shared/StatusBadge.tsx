/**
 * StatusBadge Component
 * 
 * Standardized status badge component with consistent color and label mappings
 * for compliance status indicators across the application.
 */

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ComplianceStatus = "on_track" | "at_risk" | "non_compliant"
export type ApplicationStatus = "draft" | "submitted" | "pending_review" | "interview" | "rejected" | "pending"
export type ActivityStatus = "applied" | "skipped" | "skip" | "error" | "pending"

export type StatusBadgeType = ComplianceStatus | ApplicationStatus | ActivityStatus

export interface StatusBadgeProps {
  /** Status type */
  status: StatusBadgeType
  /** Optional custom label (defaults to standard label for status) */
  label?: string
  /** Optional className */
  className?: string
}

/**
 * Get standard label for a status type
 */
function getStatusLabel(status: StatusBadgeType): string {
  switch (status) {
    // Compliance statuses
    case "on_track":
      return "On track"
    case "at_risk":
      return "At risk"
    case "non_compliant":
      return "Non compliant"
    // Application statuses
    case "draft":
      return "Draft"
    case "submitted":
      return "Submitted"
    case "pending_review":
      return "Pending review"
    case "interview":
      return "Interview"
    case "rejected":
      return "Rejected"
    case "pending":
      return "Pending"
    // Activity statuses
    case "applied":
      return "Applied"
    case "skipped":
    case "skip":
      return "Skipped"
    case "error":
      return "Error"
    default:
      return String(status)
  }
}

/**
 * Get badge variant for a status type
 */
function getStatusVariant(status: StatusBadgeType): "default" | "success" | "warning" | "error" | "info" | "outline" {
  switch (status) {
    // Compliance statuses
    case "on_track":
      return "success"
    case "at_risk":
      return "warning"
    case "non_compliant":
      return "error"
    // Application statuses
    case "draft":
      return "outline"
    case "submitted":
      return "success"
    case "pending_review":
      return "warning"
    case "interview":
      return "info"
    case "rejected":
      return "error"
    case "pending":
      return "outline"
    // Activity statuses
    case "applied":
      return "success"
    case "skipped":
    case "skip":
      return "warning"
    case "error":
      return "error"
    default:
      return "default"
  }
}

/**
 * Standardized status badge component
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className,
}) => {
  return (
    <Badge
      variant={getStatusVariant(status)}
      className={cn(className)}
      aria-label={`Status: ${label || getStatusLabel(status)}`}
    >
      {label || getStatusLabel(status)}
    </Badge>
  )
}

