/**
 * JobsPage Component
 * 
 * Job search and discovery page for claimants.
 * Displays job listings with filtering and batch approval capabilities.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { apiGet, apiPost } from "@/lib/apiClient"
import { JobSearchFilters, type JobSearchFilters as JobSearchFiltersType } from "@/components/jobsearch/JobSearchFilters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PageHeader, ErrorState, EmptyState } from "@/components/shared"
import { Search, CheckCircle2, XCircle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalytics } from "@/lib/useAnalytics"

interface Job {
  id: string
  title: string
  company: string
  location?: string
  platform: string
  status: string
  url?: string
  discoveredAt?: string
  salary?: string
  discoveredFromDiscoverOnly?: boolean
}

interface JobsResponse {
  jobs: Job[]
  total: number
  limit: number
  offset: number
}

const DEFAULT_FILTERS: JobSearchFiltersType = {
  query: "",
  location: "",
  radiusKm: 25,
  platform: "all",
  remotePreference: "any",
  easyApplyOnly: false,
  autoApplyEnabled: true,
  requireReview: true,
}

export const JobsPage: React.FC = () => {
  const navigate = useNavigate()
  const { track } = useAnalytics()
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [selectedJobIds, setSelectedJobIds] = React.useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState<JobSearchFiltersType>(DEFAULT_FILTERS)
  const [hasSearched, setHasSearched] = React.useState(false)

  const fetchJobs = React.useCallback(async (searchFilters?: JobSearchFiltersType) => {
    setIsLoading(true)
    setError(null)
    const activeFilters = searchFilters || filters

    try {
      const params = new URLSearchParams()
      if (activeFilters.platform && activeFilters.platform !== "all") {
        params.append("platform", activeFilters.platform)
      }
      // Add other filters as needed
      params.append("limit", "100")
      params.append("offset", "0")

      const response = await apiGet<JobsResponse>(`/api/claimant/jobs?${params.toString()}`)
      setJobs(response.jobs || [])
      setHasSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs")
      setJobs([])
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const handleSearch = (searchFilters: JobSearchFiltersType) => {
    setFilters(searchFilters)
    fetchJobs(searchFilters)
    
    // Track job search event
    track({
      event: "job_search_performed",
      platform: searchFilters.platform || "all",
      easyApplyOnly: searchFilters.easyApplyOnly || false,
      remotePreference: searchFilters.remotePreference || "any",
      radiusKm: searchFilters.radiusKm || 25,
      hasSalaryFilter: false, // Add if salary filter is implemented
      autoApplyEnabled: searchFilters.autoApplyEnabled || false,
    } as any)
  }

  const handleSelectJob = (jobId: string, checked: boolean) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(jobId)
      } else {
        next.delete(jobId)
      }
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobIds(new Set(jobs.map((j) => j.id)))
    } else {
      setSelectedJobIds(new Set())
    }
  }

  const handleBatchApprove = async () => {
    if (selectedJobIds.size === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      const applications = Array.from(selectedJobIds).map((jobId) => ({
        jobId,
        action: "approve" as const,
      }))

      const res = await apiPost<{
        status: string
        approved: number
        rejected: number
        approvedJobIds: string[]
      }>("/api/claimant/applications/batch", { applications })

      // Update job statuses locally
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          selectedJobIds.has(job.id) ? { ...job, status: "approved" } : job
        )
      )

      // Track job approval event
      const platforms = Array.from(new Set(jobs.filter(j => selectedJobIds.has(j.id)).map(j => j.platform)))
      track({
        event: "job_approved_for_auto_apply",
        batchSize: selectedJobIds.size,
        platforms,
        isAutoApply: filters.autoApplyEnabled || false,
        requiredReview: filters.requireReview || true,
        jobTypesCount: 1, // Could be enhanced to count distinct job types
      } as any)

      // Clear selection
      setSelectedJobIds(new Set())

      // Navigate to the review/confirmation page with the approved ids (so it can render useful detail)
      navigate("/app/applications/review", {
        state: { approvedJobIds: res.approvedJobIds },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve applications")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === "applied") {
      return (
        <Badge variant="outline" className="bg-success-50 text-success-700 border-success-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Applied
        </Badge>
      )
    }
    if (statusLower === "approved") {
      return (
        <Badge variant="outline" className="bg-info-50 text-info-800 border-info-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      )
    }
    if (statusLower === "rejected" || statusLower === "skip") {
      return (
        <Badge variant="outline" className="bg-neutral-50 text-neutral-700">
          <XCircle className="h-3 w-3 mr-1" />
          Skipped
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-primary-50 text-primary-700">
        Pending
      </Badge>
    )
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6" data-testid="jobs-page">
      <PageHeader
        title="Suggested roles and job search"
        description="Browse jobs that match your skills and preferences. Jobs discovered from 'discover only' runs are marked below. Select jobs to approve for automatic application, or review them before submitting."
      />

      {error && (
        <ErrorState
          title="Error loading jobs"
          message={error}
          onRetry={() => fetchJobs()}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Filters Panel */}
        <div className="lg:col-span-1">
          <JobSearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={handleSearch}
            isSearching={isLoading}
          />
        </div>

        {/* Jobs List */}
        <div className="lg:col-span-2 space-y-4">
          {selectedJobIds.size > 0 && (
            <Card className="border-primary-200 bg-primary-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-primary-800">
                    <strong>{selectedJobIds.size}</strong> job{selectedJobIds.size !== 1 ? "s" : ""} selected
                  </p>
                  <Button
                    onClick={handleBatchApprove}
                    disabled={isSubmitting}
                    size="sm"
                  >
                    {isSubmitting ? "Submitting..." : "Review and apply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="h-16 bg-neutral-100 rounded animate-pulse" />
                  <div className="h-16 bg-neutral-100 rounded animate-pulse" />
                  <div className="h-16 bg-neutral-100 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ) : jobs.length === 0 && hasSearched ? (
            <EmptyState
              title="No jobs found"
              description="Try adjusting your filters or check back later."
              icon={<Search className="h-12 w-12 mx-auto text-neutral-400" />}
            />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="Start your job search"
              description="Use the filters above to search for jobs that match your preferences."
              icon={<Search className="h-12 w-12 mx-auto text-neutral-400" />}
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Job Listings</CardTitle>
                    <CardDescription>
                      {jobs.length} job{jobs.length !== 1 ? "s" : ""} found
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedJobIds.size === jobs.length && jobs.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm text-text-secondary cursor-pointer"
                    >
                      Select all
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <span className="sr-only">Select</span>
                      </TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Discovered</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => {
                      const isSelected = selectedJobIds.has(job.id)
                      const isApplied = job.status.toLowerCase() === "applied" || job.status.toLowerCase() === "approved"
                      return (
                        <TableRow
                          key={job.id}
                          className={cn(
                            isSelected && "bg-primary-50",
                            isApplied && "opacity-60"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleSelectJob(job.id, checked === true)
                              }
                              disabled={isApplied}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-text-primary">{job.title}</p>
                                {job.discoveredFromDiscoverOnly && (
                                  <Badge variant="warning" className="text-xs">
                                    Discover only
                                  </Badge>
                                )}
                              </div>
                              {job.location && (
                                <p className="text-xs text-text-secondary">{job.location}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-text-secondary">
                            {job.company}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {job.platform}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell className="text-sm text-text-secondary">
                            {formatDate(job.discoveredAt)}
                          </TableCell>
                          <TableCell>
                            {job.url && (
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700"
                                aria-label={`View ${job.title} at ${job.company}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

