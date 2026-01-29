/**
 * ApplicationBatchConfirmationPage Component
 *
 * Confirmation screen after approving a batch of jobs from the Jobs page.
 * Shows which jobs were approved, explains what happens next, and allows a quick undo.
 */

import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CheckCircle2, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react"
import { apiGet, apiPost } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, ErrorState, PageHeader } from "@/components/shared"
import { useToast } from "@/contexts/ToastContext"

type LocationState = {
  approvedJobIds?: string[]
}

interface JobsResponse {
  jobs: Array<{
    id: string
    title: string
    company: string
    location?: string
    platform: string
    status: string
    url?: string
    approvedAt?: string
  }>
}

export const ApplicationBatchConfirmationPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const approvedJobIds =
    ((location.state as LocationState | null | undefined)?.approvedJobIds ?? []).filter(Boolean)

  const [jobs, setJobs] = React.useState<JobsResponse["jobs"]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set(approvedJobIds))
  const [isUndoing, setIsUndoing] = React.useState(false)

  React.useEffect(() => {
    setSelectedIds(new Set(approvedJobIds))
  }, [approvedJobIds.join("|")])

  const fetchJobs = React.useCallback(async () => {
    if (approvedJobIds.length === 0) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiGet<JobsResponse>("/api/claimant/jobs?limit=500&offset=0")
      const wanted = new Set(approvedJobIds)
      const filtered = (res.jobs || []).filter((j) => wanted.has(j.id))
      setJobs(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approved jobs")
      setJobs([])
    } finally {
      setIsLoading(false)
    }
  }, [approvedJobIds.join("|")])

  React.useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleToggle = (jobId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(jobId)
      else next.delete(jobId)
      return next
    })
  }

  const handleUndoSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setIsUndoing(true)
    try {
      await apiPost("/api/claimant/applications/batch", {
        applications: ids.map((jobId) => ({ jobId, action: "reject" as const })),
      })
      showToast({
        title: "Selections updated",
        description:
          "The selected jobs were marked as rejected. If an automation run has already started, changes may not take effect immediately.",
        variant: "success",
      })
      navigate("/app/jobs", { replace: true })
    } catch (err) {
      showToast({
        title: "Could not undo",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsUndoing(false)
    }
  }

  if (approvedJobIds.length === 0) {
    return (
      <div className="space-y-6" data-testid="application-review-page">
        <PageHeader
          title="Review and apply"
          description="Use the Jobs page to select roles and approve them for application."
        />
        <EmptyState
          title="Nothing to review"
          description="No approved jobs were passed to this page."
          action={
            <Button onClick={() => navigate("/app/jobs")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Jobs
            </Button>
          }
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6" data-testid="application-review-page">
        <PageHeader title="Review and apply" />
        <ErrorState title="Unable to load approved jobs" message={error} onRetry={fetchJobs} />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="application-review-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Approved jobs"
          description="These roles were approved from your Jobs list. JobFlow logs the approval as evidence and may start an automation run in the background."
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/app/jobs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
          <Button onClick={() => navigate("/app/dashboard")}>Go to dashboard</Button>
        </div>
      </div>

      <Card className="border-info-200 bg-info-50">
        <CardContent className="pt-6 space-y-2">
          <p className="text-sm text-info-900">
            <strong>{approvedJobIds.length}</strong> job{approvedJobIds.length !== 1 ? "s" : ""} approved.
          </p>
          <p className="text-xs text-info-800">
            If you approved a job by mistake, you can undo it below. If an automation run has already started,
            undoing may not stop the current run.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved list</CardTitle>
          <CardDescription>
            {isLoading ? "Loading…" : `${jobs.length} loaded`} · {selectedIds.size} selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">Link</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-text-secondary py-8">
                    Loading approved jobs…
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-text-secondary py-8">
                    No approved jobs found in your queue.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(job.id)}
                        onCheckedChange={(checked) => handleToggle(job.id, checked === true)}
                        aria-label={`Select ${job.title} at ${job.company}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-text-primary">{job.title}</div>
                        {job.location && <div className="text-xs text-text-tertiary">{job.location}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary">{job.company}</TableCell>
                    <TableCell className="capitalize">{job.platform || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="info">Approved</Badge>
                    </TableCell>
                    <TableCell>
                      {job.url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}
                          aria-label="Open job posting"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <Button variant="outline" disabled={isUndoing || selectedIds.size === 0} onClick={handleUndoSelected}>
              {isUndoing ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2 animate-pulse" />
                  Undoing…
                </>
              ) : (
                "Undo selected (reject)"
              )}
            </Button>
            <Button variant="outline" onClick={() => fetchJobs()} disabled={isLoading}>
              Refresh
            </Button>
            <Button onClick={() => navigate("/app/dashboard")}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

