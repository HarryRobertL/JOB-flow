/**
 * ClaimantTable Component
 * 
 * Reusable table component for displaying claimant lists in work coach dashboard.
 * Includes sorting, selection, and accessibility features.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "./StatusBadge"
import { cn } from "@/lib/utils"
import type { Claimant, RegimeLevel } from "@/types/staff"
import { ChevronRight } from "lucide-react"

export interface ClaimantTableProps {
  /** List of claimants to display */
  claimants: Claimant[]
  /** Callback when a claimant row is clicked */
  onClaimantSelect?: (claimant: Claimant) => void
  /** Currently selected claimant ID */
  selectedClaimantId?: string | null
  /** Loading state */
  isLoading?: boolean
  /** Whether to navigate to detail page on click (default: false, shows in sidebar) */
  navigateToDetail?: boolean
}

export const ClaimantTable: React.FC<ClaimantTableProps> = ({
  claimants,
  onClaimantSelect,
  selectedClaimantId,
  isLoading = false,
  navigateToDetail = false,
}) => {
  const navigate = useNavigate()

  const handleClaimantClick = (claimant: Claimant) => {
    if (navigateToDetail) {
      // Preserve current URL search params as state
      const currentSearch = window.location.search
      navigate(`/staff/work-coach/claimants/${claimant.id}`, {
        state: { filters: currentSearch },
      })
    } else {
      onClaimantSelect?.(claimant)
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return "Today"
      } else if (diffDays === 1) {
        return "Yesterday"
      } else if (diffDays < 7) {
        return `${diffDays} days ago`
      } else {
        return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      }
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-DEFAULT p-8">
        <div className="text-center text-sm text-text-secondary">Loading claimants...</div>
      </div>
    )
  }

  if (claimants.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-DEFAULT p-8">
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">No claimants found</p>
          <p className="mt-1 text-sm text-text-secondary">
            Try adjusting your filters to see more results.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-DEFAULT overflow-hidden" data-testid="claimant-table">
      <Table role="table" aria-label="Claimants list">
        <TableHeader>
          <TableRow className="bg-neutral-50">
            <TableHead className="w-[25%]" scope="col">Claimant name</TableHead>
            <TableHead className="w-[15%]" scope="col">Regime level</TableHead>
            <TableHead className="w-[15%]" scope="col">Last activity</TableHead>
            <TableHead className="w-[15%]" scope="col">Applications this week</TableHead>
            <TableHead className="w-[20%]" scope="col">Compliance status</TableHead>
            <TableHead className="w-[10%] text-right" scope="col">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claimants.map((claimant, index) => {
            const isSelected = selectedClaimantId === claimant.id
            return (
              <TableRow
                key={claimant.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected && "bg-primary-50",
                  !isSelected && "hover:bg-neutral-50",
                  index % 2 === 1 && "bg-neutral-25/50"
                )}
                onClick={() => handleClaimantClick(claimant)}
                aria-selected={isSelected}
                role="row"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleClaimantClick(claimant)
                  }
                }}
              >
                <TableCell className="font-medium text-text-primary">
                  {navigateToDetail ? (
                    <button
                      className="hover:text-primary-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClaimantClick(claimant)
                      }}
                      aria-label={`View details for ${claimant.name}`}
                    >
                      {claimant.name}
                    </button>
                  ) : (
                    claimant.name
                  )}
                </TableCell>
                <TableCell className="text-sm text-text-secondary">
                  {getRegimeLabel(claimant.regimeLevel)}
                </TableCell>
                <TableCell className="text-sm text-text-secondary">
                  {formatDate(claimant.lastActivityDate)}
                </TableCell>
                <TableCell className="text-sm text-text-secondary">
                  {claimant.applicationsThisWeek}
                </TableCell>
                <TableCell>
                  <StatusBadge status={claimant.complianceStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <ChevronRight className="h-4 w-4 text-neutral-400 ml-auto" aria-hidden="true" />
                  <span className="sr-only">View details for {claimant.name}</span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

