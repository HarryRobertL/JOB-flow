/**
 * WorkCoachCompliancePage
 *
 * Compliance-focused view across assigned claimants.
 * Provides quick navigation into claimant detail for evidence, notes, and actions.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { apiGet } from "@/lib/apiClient"
import { PageHeader, ErrorState, EmptyState, StatusBadge } from "@/components/shared"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select } from "@/components/ui/select"
import { ArrowRight, Filter } from "lucide-react"

interface ClaimantRow {
  id: string
  name: string
  complianceStatus: "on_track" | "at_risk" | "non_compliant"
  regimeLevel: string
  requiredApplications: number
  completedApplications: number
  region?: string
  jobcentre?: string
}

interface WorkCoachClaimantsResponse {
  claimants: ClaimantRow[]
}

export const WorkCoachCompliancePage: React.FC = () => {
  const navigate = useNavigate()
  const [claimants, setClaimants] = React.useState<ClaimantRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<"all" | ClaimantRow["complianceStatus"]>("all")

  const fetchClaimants = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiGet<WorkCoachClaimantsResponse>("/api/staff/work-coach/claimants")
      setClaimants(res.claimants || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claimants")
      setClaimants([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchClaimants()
  }, [fetchClaimants])

  const filtered = React.useMemo(() => {
    if (statusFilter === "all") return claimants
    return claimants.filter((c) => c.complianceStatus === statusFilter)
  }, [claimants, statusFilter])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Compliance" description="Loading…" />
        <div className="h-48 bg-neutral-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Compliance" />
        <ErrorState title="Unable to load compliance view" message={error} onRetry={fetchClaimants} />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="work-coach-compliance-page">
      <PageHeader
        title="Compliance"
        description="Review compliance across your assigned claimants. Open a case to record notes and compliance actions."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Filter by compliance status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-text-secondary mb-2">
              Status
            </label>
            <Select id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All</option>
              <option value="on_track">On track</option>
              <option value="at_risk">At risk</option>
              <option value="non_compliant">Non compliant</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => fetchClaimants()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No claimants found" description="Try adjusting your filters." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Claimants</CardTitle>
            <CardDescription>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claimant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>This week</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.complianceStatus} />
                    </TableCell>
                    <TableCell>
                      {c.completedApplications} / {c.requiredApplications}
                    </TableCell>
                    <TableCell className="capitalize">{c.regimeLevel.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-text-secondary">{c.region || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => navigate(`/staff/work-coach/claimants/${c.id}`)} className="gap-2">
                        View case
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

