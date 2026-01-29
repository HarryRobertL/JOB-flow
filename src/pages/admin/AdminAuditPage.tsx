/**
 * Admin Audit Log
 *
 * View audit trail of staff and system actions with filters and pagination.
 */

import * as React from "react"
import { apiGet } from "@/lib/apiClient"
import { PageHeader, ErrorState, EmptyState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react"

const PAGE_SIZE = 50
const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "user.created", label: "User created" },
  { value: "user.updated", label: "User updated" },
  { value: "settings.updated", label: "Settings updated" },
  { value: "export.report", label: "Report export" },
]

interface AuditEntry {
  ts: string
  actor_id: string
  actor_email: string
  action: string
  resource_type: string
  resource_id: string
  details?: Record<string, unknown>
}

interface AuditResponse {
  entries: AuditEntry[]
  limit: number
  offset: number
}

function formatAuditDate(ts: string): string {
  if (!ts) return "—"
  try {
    const d = new Date(ts)
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return ts
  }
}

function detailsSummary(details: Record<string, unknown> | undefined): string {
  if (!details || typeof details !== "object") return "—"
  const parts: string[] = []
  if (details.format) parts.push(String(details.format))
  if (details.type) parts.push(String(details.type))
  if (details.role) parts.push(String(details.role))
  if (parts.length) return parts.join(", ")
  return Object.keys(details).length ? JSON.stringify(details).slice(0, 40) + "…" : "—"
}

export const AdminAuditPage: React.FC = () => {
  const [entries, setEntries] = React.useState<AuditEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [actionFilter, setActionFilter] = React.useState("")
  const [offset, setOffset] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const fetchAudit = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("limit", String(PAGE_SIZE))
      params.set("offset", String(offset))
      if (fromDate) params.set("from_date", fromDate)
      if (toDate) params.set("to_date", toDate)
      if (actionFilter) params.set("action", actionFilter)
      const res = await apiGet<AuditResponse>(`/api/staff/admin/audit?${params.toString()}`)
      setEntries(res.entries ?? [])
      setHasMore((res.entries?.length ?? 0) >= PAGE_SIZE)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log")
    } finally {
      setIsLoading(false)
    }
  }, [offset, fromDate, toDate, actionFilter])

  React.useEffect(() => {
    fetchAudit()
  }, [fetchAudit, refreshKey])

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0)
    setRefreshKey((k) => k + 1)
  }

  const prevPage = () => setOffset((o) => Math.max(0, o - PAGE_SIZE))
  const nextPage = () => setOffset((o) => o + PAGE_SIZE)

  if (error && entries.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit log" description="View a log of staff and system actions for compliance and security." />
        <ErrorState title="Unable to load audit log" message={error} onRetry={fetchAudit} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="View a log of staff and system actions for compliance and security. Use filters to narrow by date or action type."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by date range and action type, then apply.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApplyFilters} className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="from_date">From date</Label>
              <Input
                id="from_date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to_date">To date</Label>
              <Input
                id="to_date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="action">Action</Label>
              <select
                id="action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="flex h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4 mr-2" />
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
          <CardDescription>Newest first. Page size: {PAGE_SIZE}.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-text-secondary py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              title="No audit entries"
              description="No entries match the current filters, or the audit log is empty."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, i) => (
                    <TableRow key={`${entry.ts}-${entry.actor_id}-${i}`}>
                      <TableCell className="whitespace-nowrap text-text-secondary">
                        {formatAuditDate(entry.ts)}
                      </TableCell>
                      <TableCell>{entry.actor_email || entry.actor_id || "—"}</TableCell>
                      <TableCell>{entry.action || "—"}</TableCell>
                      <TableCell>
                        {entry.resource_type && entry.resource_id
                          ? `${entry.resource_type}:${entry.resource_id}`
                          : entry.resource_type || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-text-secondary">
                        {detailsSummary(entry.details)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <Button variant="outline" size="sm" onClick={prevPage} disabled={offset === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-text-secondary">
                  Showing {offset + 1}–{offset + entries.length}
                </span>
                <Button variant="outline" size="sm" onClick={nextPage} disabled={!hasMore}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
