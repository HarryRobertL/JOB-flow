/**
 * ActivityDetailModal
 *
 * Modal showing full details for a single activity entry (job application).
 * Used on claimant dashboard, application history, and coach claimant detail.
 */

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, FileImage } from "lucide-react"

export interface ActivityDetailEntry {
  id: string
  jobTitle: string
  company: string
  status: string
  submittedAt?: string
  platform?: string
  url?: string
  notes?: string
  errorMessage?: string
  artifactUrl?: string | null
}

export interface ActivityDetailModalProps {
  activity: ActivityDetailEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatTimestamp(iso?: string): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    applied: "Submitted",
    submitted: "Submitted",
    skip: "Skipped",
    skipped: "Skipped",
    error: "Error",
    pending: "Pending",
    draft: "Draft",
    rejected: "Rejected",
    interview: "Interview",
  }
  return map[status?.toLowerCase()] ?? status ?? "—"
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  open,
  onOpenChange,
}) => {
  if (!activity) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onClose={() => onOpenChange(false)}
        aria-describedby="activity-detail-description"
      >
        <DialogHeader>
          <DialogTitle className="text-lg">Application details</DialogTitle>
        </DialogHeader>
        <div id="activity-detail-description" className="space-y-4">
          <div>
            <p className="text-sm text-text-secondary">Job</p>
            <p className="font-medium text-text-primary">{activity.jobTitle}</p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Company</p>
            <p className="text-text-primary">{activity.company}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-secondary">Platform:</span>
            <Badge variant="outline" className="text-xs">
              {activity.platform || "—"}
            </Badge>
            <span className="text-sm text-text-secondary">Status:</span>
            <Badge variant="outline" className="text-xs">
              {statusLabel(activity.status)}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Date and time</p>
            <p className="text-text-primary">{formatTimestamp(activity.submittedAt)}</p>
          </div>
          {(activity.notes || activity.errorMessage) && (
            <div>
              <p className="text-sm text-text-secondary">
                {activity.status?.toLowerCase() === "error" ? "Error or note" : "Notes"}
              </p>
              <p className="text-sm text-text-primary rounded-md bg-neutral-50 border border-neutral-200 p-2">
                {activity.errorMessage || activity.notes || "—"}
              </p>
            </div>
          )}
          {activity.url && (
            <div>
              <a
                href={activity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bgLayer2 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blueAccent"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open job listing
              </a>
            </div>
          )}
          {activity.artifactUrl && (
            <div>
              <a
                href={activity.artifactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bgLayer2 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blueAccent"
              >
                <FileImage className="h-3.5 w-3.5" />
                View artifact
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
