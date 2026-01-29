/**
 * ApplicationReviewCard Component
 * 
 * Card component for reviewing individual job applications.
 */

import * as React from "react"
import { ExternalLink, MapPin, Building2, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ApplicationReview {
  id: string
  jobTitle: string
  company: string
  location: string
  platform: string
  url: string
  salary?: string
  description?: string
  queuedAt: string
  status: "pending_review" | "ready_to_submit" | "auto_queued"
}

export interface ApplicationReviewCardProps {
  /** Application data */
  application: ApplicationReview
  /** Whether this application is selected */
  selected?: boolean
  /** Callback when selection changes */
  onSelectChange?: (id: string, selected: boolean) => void
  /** Callback to view application details */
  onView?: (id: string) => void
  /** Additional className */
  className?: string
}

export const ApplicationReviewCard: React.FC<ApplicationReviewCardProps> = ({
  application,
  selected = false,
  onSelectChange,
  onView,
  className,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = () => {
    switch (application.status) {
      case "pending_review":
        return <Badge variant="warning">Pending review</Badge>
      case "ready_to_submit":
        return <Badge variant="success">Ready to submit</Badge>
      case "auto_queued":
        return <Badge variant="info">Auto-queued</Badge>
      default:
        return null
    }
  }

  return (
    <Card
      className={cn(
        "transition-all",
        selected && "ring-2 ring-primary-500 border-primary-500",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {onSelectChange && (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => onSelectChange(application.id, e.target.checked)}
                  className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                  aria-label={`Select ${application.jobTitle}`}
                />
              )}
              <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {application.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {application.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(application.queuedAt)}
              </span>
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge()}
            <Badge variant="outline">{application.platform}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {application.description && (
          <p className="text-sm text-text-secondary line-clamp-3">
            {application.description}
          </p>
        )}
        {application.salary && (
          <p className="text-sm font-medium text-text-primary">
            Salary: {application.salary}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView?.(application.id)}
            className="flex-1"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(application.url, "_blank")}
            className="flex-1"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open job
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

