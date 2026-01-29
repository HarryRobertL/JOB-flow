/**
 * JobSearchFilters Component
 * 
 * Improved job search filters with state persistence and better UX.
 * Makes the difference between "Auto apply" and "Manual review" explicit.
 */

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/forms"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalytics } from "@/lib/useAnalytics"

export interface JobSearchFilters {
  query: string
  location: string
  radiusKm: number
  platform: "indeed" | "greenhouse" | "lever" | "all"
  salaryMin?: number
  remotePreference: "any" | "remote" | "hybrid" | "onsite"
  easyApplyOnly: boolean
  autoApplyEnabled: boolean
  requireReview: boolean
  dailyCap?: number
}

export interface JobSearchFiltersProps {
  /** Current filter values */
  filters: JobSearchFilters
  /** Callback when filters change */
  onFiltersChange: (filters: JobSearchFilters) => void
  /** Callback to apply filters and search */
  onSearch: (filters: JobSearchFilters) => void
  /** Whether search is in progress */
  isSearching?: boolean
  /** Additional className */
  className?: string
}

const DEFAULT_FILTERS: JobSearchFilters = {
  query: "",
  location: "",
  radiusKm: 25,
  platform: "indeed",
  remotePreference: "any",
  easyApplyOnly: true,
  autoApplyEnabled: true,
  requireReview: true,
}

export const JobSearchFilters: React.FC<JobSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  isSearching = false,
  className,
}) => {
  const { track } = useAnalytics()

  // Load filters from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("jobSearchFilters")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        onFiltersChange({ ...DEFAULT_FILTERS, ...parsed })
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save filters to localStorage when they change
  React.useEffect(() => {
    localStorage.setItem("jobSearchFilters", JSON.stringify(filters))
  }, [filters])

  const updateFilter = <K extends keyof JobSearchFilters>(
    key: K,
    value: JobSearchFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange(DEFAULT_FILTERS)
  }

  const hasCustomFilters = React.useMemo(() => {
    return (
      filters.query !== DEFAULT_FILTERS.query ||
      filters.location !== DEFAULT_FILTERS.location ||
      filters.radiusKm !== DEFAULT_FILTERS.radiusKm ||
      filters.platform !== DEFAULT_FILTERS.platform ||
      filters.salaryMin !== undefined ||
      filters.remotePreference !== DEFAULT_FILTERS.remotePreference ||
      filters.easyApplyOnly !== DEFAULT_FILTERS.easyApplyOnly
    )
  }, [filters])

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-text-secondary" />
            <CardTitle>Job search filters</CardTitle>
          </div>
          {hasCustomFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
        <CardDescription>
          Configure your job search criteria and automation preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Search Fields */}
        <div className="space-y-4">
          <FormField
            label="Job query"
            name="query"
            id="query"
            required
            description="Job title or keywords (e.g., 'Retail assistant', 'Customer service')"
          >
            <Input
              type="text"
              value={filters.query}
              onChange={(e) => updateFilter("query", e.target.value)}
              placeholder="Retail assistant"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Location"
              name="location"
              id="location"
              required
              description="City or town"
            >
              <Input
                type="text"
                value={filters.location}
                onChange={(e) => updateFilter("location", e.target.value)}
                placeholder="Cardiff"
              />
            </FormField>

            <FormField
              label="Search radius"
              name="radiusKm"
              id="radiusKm"
              description="Distance in kilometers"
            >
              <Input
                type="number"
                min="1"
                max="100"
                value={filters.radiusKm}
                onChange={(e) => updateFilter("radiusKm", parseInt(e.target.value) || 25)}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Platform"
              name="platform"
              id="platform"
            >
              <Select
                value={filters.platform}
                onChange={(e) => updateFilter("platform", e.target.value as JobSearchFilters["platform"])}
              >
                <option value="indeed">Indeed</option>
                <option value="greenhouse">Greenhouse</option>
                <option value="lever">Lever</option>
                <option value="all">All platforms</option>
              </Select>
            </FormField>

            <FormField
              label="Remote preference"
              name="remotePreference"
              id="remotePreference"
            >
              <Select
                value={filters.remotePreference}
                onChange={(e) => updateFilter("remotePreference", e.target.value as JobSearchFilters["remotePreference"])}
              >
                <option value="any">Any</option>
                <option value="remote">Remote only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite only</option>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Minimum salary (optional)"
            name="salaryMin"
            id="salaryMin"
            description="Annual salary in GBP"
          >
            <Input
              type="number"
              min="0"
              value={filters.salaryMin || ""}
              onChange={(e) => updateFilter("salaryMin", e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="22000"
            />
          </FormField>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <Label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.easyApplyOnly}
                onChange={(e) => updateFilter("easyApplyOnly", e.target.checked)}
                className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium">Easy Apply only (Indeed)</span>
            </Label>
            <p className="mt-1 text-xs text-text-secondary ml-6">
              Only show jobs with simplified application forms
            </p>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="border-t pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Application automation
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              Choose how applications are handled when jobs match your criteria
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border-2 border-primary-200 bg-primary-50 p-4">
              <Label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.autoApplyEnabled}
                  onChange={(e) => updateFilter("autoApplyEnabled", e.target.checked)}
                  className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm font-semibold">Auto apply</span>
                <Badge variant="outline" className="ml-2">Automatic</Badge>
              </Label>
              <p className="mt-2 text-xs text-primary-800 ml-6">
                Applications will be automatically submitted for matching jobs.
                {filters.requireReview && " You'll be notified to review before submission."}
              </p>
            </div>

            {filters.autoApplyEnabled && (
              <div className="ml-6 space-y-3">
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <Label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.requireReview}
                      onChange={(e) => updateFilter("requireReview", e.target.checked)}
                      className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium">Require manual review</span>
                    <Badge variant="outline" className="ml-2">Manual review</Badge>
                  </Label>
                  <p className="mt-1 text-xs text-text-secondary ml-6">
                    When enabled, you must review and approve each application before it's submitted.
                    This gives you more control but requires your attention.
                  </p>
                </div>

                <FormField
                  label="Daily application cap"
                  name="dailyCap"
                  id="dailyCap"
                  description="Maximum number of applications per day (leave empty for no limit)"
                >
                  <Input
                    type="number"
                    min="1"
                    value={filters.dailyCap || ""}
                    onChange={(e) => updateFilter("dailyCap", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="15"
                  />
                </FormField>
              </div>
            )}

            {!filters.autoApplyEnabled && (
              <div className="rounded-lg border-2 border-neutral-200 bg-neutral-50 p-4 ml-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Manual mode</Badge>
                </div>
                <p className="text-xs text-text-secondary">
                  You'll receive notifications about matching jobs and can choose to apply manually.
                  No applications will be submitted automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Search Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={async () => {
              // Track job search event
              await track({
                event: "job_search_performed" as const,
                platform: filters.platform,
                easyApplyOnly: filters.easyApplyOnly,
                remotePreference: filters.remotePreference,
                radiusKm: filters.radiusKm,
                hasSalaryFilter: filters.salaryMin !== undefined,
                autoApplyEnabled: filters.autoApplyEnabled,
              } as any)
              onSearch(filters)
            }}
            disabled={isSearching || !filters.query || !filters.location}
            className="min-w-[120px]"
          >
            {isSearching ? (
              <>
                <Search className="mr-2 h-4 w-4 animate-pulse" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search jobs
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

