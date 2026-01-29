/**
 * FilterBar Component
 * 
 * Reusable filter bar component for staff dashboards.
 * Provides status filters, sort options, and other filtering controls.
 */

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ComplianceStatus, RegimeLevel, CohortType, FilterOptions } from "@/types/staff"
import { Filter } from "lucide-react"

export interface FilterBarProps {
  /** Current filter state */
  filters: FilterOptions
  /** Callback when filters change */
  onFiltersChange: (filters: FilterOptions) => void
  /** Available compliance statuses to filter by */
  availableStatuses?: ComplianceStatus[]
  /** Available regime levels to filter by */
  availableRegimes?: RegimeLevel[]
  /** Show region filter */
  showRegionFilter?: boolean
  /** Show jobcentre filter */
  showJobcentreFilter?: boolean
  /** Show cohort (pilot/control) filter */
  showCohortFilter?: boolean
  /** Show time window filter */
  showTimeWindow?: boolean
  /** Show search by name */
  showSearchName?: boolean
  /** Available regions */
  regions?: string[]
  /** Available jobcentres */
  jobcentres?: string[]
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  availableStatuses = ["on_track", "at_risk", "non_compliant"],
  availableRegimes = ["intensive", "standard", "light_touch"],
  showRegionFilter = false,
  showJobcentreFilter = false,
  showCohortFilter = false,
  showTimeWindow = false,
  showSearchName = false,
  regions = [],
  jobcentres = [],
}) => {
  const toggleStatus = (status: ComplianceStatus) => {
    const currentStatuses = filters.status || []
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status]
    onFiltersChange({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined })
  }

  const toggleRegime = (regime: RegimeLevel) => {
    const currentRegimes = filters.regimeLevel || []
    const newRegimes = currentRegimes.includes(regime)
      ? currentRegimes.filter((r) => r !== regime)
      : [...currentRegimes, regime]
    onFiltersChange({ ...filters, regimeLevel: newRegimes.length > 0 ? newRegimes : undefined })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = Boolean(
    filters.searchName ||
    filters.status?.length ||
    filters.regimeLevel?.length ||
    filters.region ||
    filters.jobcentre ||
    filters.cohort ||
    filters.timeWindow
  )

  const getStatusLabel = (status: ComplianceStatus) => {
    switch (status) {
      case "on_track":
        return "On track"
      case "at_risk":
        return "At risk"
      case "non_compliant":
        return "Non compliant"
    }
  }

  const getRegimeLabel = (regime: RegimeLevel) => {
    switch (regime) {
      case "intensive":
        return "Intensive"
      case "standard":
        return "Standard"
      case "light_touch":
        return "Light touch"
    }
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-DEFAULT p-4" data-testid="filter-bar" role="search" aria-label="Filter claimants">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text-primary">Filters</h3>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs"
              aria-label="Clear all filters"
              data-testid="clear-filters-button"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Search by Name */}
        {showSearchName && (
          <div>
            <label htmlFor="search-name" className="mb-2 block text-xs font-medium text-text-secondary">
              Search by name
            </label>
            <Input
              id="search-name"
              type="text"
              placeholder="Enter claimant name..."
              value={filters.searchName || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  searchName: e.target.value || undefined,
                })
              }
              className="h-10"
              aria-label="Search claimants by name"
              data-testid="search-name-input"
            />
          </div>
        )}

        {/* Status Filters */}
        <fieldset>
          <legend className="mb-2 block text-xs font-medium text-text-secondary">
            Compliance status
          </legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by compliance status">
            {availableStatuses.map((status) => {
              const isActive = filters.status?.includes(status)
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                    isActive
                      ? "bg-primary-500 text-white hover:bg-primary-600"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  )}
                  aria-pressed={isActive}
                  aria-label={`Filter by ${getStatusLabel(status)} status`}
                  data-testid={`filter-status-${status}`}
                >
                  {getStatusLabel(status)}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Regime Level Filters */}
        <fieldset>
          <legend className="mb-2 block text-xs font-medium text-text-secondary">
            Regime level
          </legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by regime level">
            {availableRegimes.map((regime) => {
              const isActive = filters.regimeLevel?.includes(regime)
              return (
                <button
                  key={regime}
                  type="button"
                  onClick={() => toggleRegime(regime)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                    isActive
                      ? "bg-primary-500 text-white hover:bg-primary-600"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  )}
                  aria-pressed={isActive}
                  aria-label={`Filter by ${getRegimeLabel(regime)} regime level`}
                  data-testid={`filter-regime-${regime}`}
                >
                  {getRegimeLabel(regime)}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Region and Jobcentre Filters */}
        {(showRegionFilter || showJobcentreFilter) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {showRegionFilter && (
              <div>
                <label htmlFor="region-filter" className="mb-2 block text-xs font-medium text-text-secondary">
                  Region
                </label>
                <select
                  id="region-filter"
                  value={filters.region || ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      region: e.target.value || undefined,
                    })
                  }
                  className="h-10 w-full rounded-md border border-border-default bg-surface-DEFAULT px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label="Filter by region"
                  data-testid="region-filter"
                >
                  <option value="">All regions</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showJobcentreFilter && (
              <div>
                <label htmlFor="jobcentre-filter" className="mb-2 block text-xs font-medium text-text-secondary">
                  Jobcentre
                </label>
                <select
                  id="jobcentre-filter"
                  value={filters.jobcentre || ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      jobcentre: e.target.value || undefined,
                    })
                  }
                  className="h-10 w-full rounded-md border border-border-default bg-surface-DEFAULT px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label="Filter by jobcentre"
                  data-testid="jobcentre-filter"
                >
                  <option value="">All jobcentres</option>
                  {jobcentres.map((jobcentre) => (
                    <option key={jobcentre} value={jobcentre}>
                      {jobcentre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Cohort Filter (pilot/control) */}
        {showCohortFilter && (
          <div>
            <label htmlFor="cohort-filter" className="mb-2 block text-xs font-medium text-text-secondary">
              Cohort
            </label>
            <select
              id="cohort-filter"
              value={filters.cohort || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  cohort: (e.target.value || undefined) as CohortType | undefined,
                })
              }
              className="h-10 w-full rounded-md border border-border-default bg-surface-DEFAULT px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Filter by cohort"
              data-testid="cohort-filter"
            >
              <option value="">All</option>
              <option value="pilot">Pilot</option>
              <option value="control">Control</option>
            </select>
          </div>
        )}

        {/* Time Window Filter */}
        {showTimeWindow && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-text-secondary">
                Start date
              </label>
              <Input
                type="date"
                value={filters.timeWindow?.start || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    timeWindow: {
                      start: e.target.value,
                      end: filters.timeWindow?.end || "",
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-text-secondary">
                End date
              </label>
              <Input
                type="date"
                value={filters.timeWindow?.end || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    timeWindow: {
                      start: filters.timeWindow?.start || "",
                      end: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        )}

        {/* Sort Options */}
        <fieldset>
          <legend className="text-xs font-medium text-text-secondary mb-2">Sort by:</legend>
          <div className="flex items-center gap-4">
            <label htmlFor="sort-by" className="sr-only">Sort by field</label>
            <select
              id="sort-by"
              value={filters.sortBy || "activity"}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  sortBy: e.target.value as "activity" | "name" | "compliance",
                })
              }
              className="h-9 rounded-md border border-border-default bg-surface-DEFAULT px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Sort by field"
              data-testid="sort-by-select"
            >
              <option value="activity">Last activity</option>
              <option value="name">Name</option>
              <option value="compliance">Compliance status</option>
            </select>
            <label htmlFor="sort-order" className="sr-only">Sort order</label>
            <select
              id="sort-order"
              value={filters.sortOrder || "desc"}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  sortOrder: e.target.value as "asc" | "desc",
                })
              }
              className="h-9 rounded-md border border-border-default bg-surface-DEFAULT px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="Sort order"
              data-testid="sort-order-select"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </fieldset>
      </div>
    </div>
  )
}

