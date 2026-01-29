/**
 * WorkCoachAppointmentsPage
 *
 * Appointment planning view based on claimant compliance signals.
 * This does not replace Jobcentre scheduling systems; it provides a practical
 * “who should I see next?” list using existing data.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { apiGet } from "@/lib/apiClient"
import { PageHeader, ErrorState, EmptyState, StatusBadge } from "@/components/shared"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, ArrowRight } from "lucide-react"

interface ClaimantRow {
  id: string
  name: string
  complianceStatus: "on_track" | "at_risk" | "non_compliant"
  lastActivityDate: string | null
  requiredApplications: number
  completedApplications: number
}

interface WorkCoachClaimantsResponse {
  claimants: ClaimantRow[]
}

function daysSince(dateIso: string | null): number | null {
  if (!dateIso) return null
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export const WorkCoachAppointmentsPage: React.FC = () => {
  const navigate = useNavigate()
  const [claimants, setClaimants] = React.useState<ClaimantRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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

  const suggested = React.useMemo(() => {
    const severity = { non_compliant: 2, at_risk: 1, on_track: 0 } as const
    return [...claimants]
      .sort((a, b) => {
        const s = severity[b.complianceStatus] - severity[a.complianceStatus]
        if (s !== 0) return s
        const da = daysSince(a.lastActivityDate) ?? -1
        const db = daysSince(b.lastActivityDate) ?? -1
        return db - da
      })
      .filter((c) => c.complianceStatus !== "on_track")
  }, [claimants])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Appointments" description="Loading…" />
        <div className="h-48 bg-neutral-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Appointments" />
        <ErrorState title="Unable to load appointment list" message={error} onRetry={fetchClaimants} />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="work-coach-appointments-page">
      <PageHeader
        title="Appointments"
        description="A suggested list of claimants to prioritise, based on compliance status and recent activity."
        actions={
          <Button variant="outline" onClick={() => fetchClaimants()} className="gap-2">
            <Calendar className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Card className="border-info-200 bg-info-50">
        <CardContent className="pt-6 space-y-2">
          <p className="text-sm text-info-900">
            This page helps you plan appointments. JobFlow does not schedule appointments or store diaries.
          </p>
          <p className="text-xs text-info-800">
            Use it as a “who should I contact next?” view. Open a claimant to review evidence and record actions.
          </p>
        </CardContent>
      </Card>

      {suggested.length === 0 ? (
        <EmptyState
          title="No suggested appointments"
          description="All assigned claimants are currently on track."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Suggested priorities</CardTitle>
            <CardDescription>Sorted by compliance risk and time since last activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claimant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>This week</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggested.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.complianceStatus} />
                    </TableCell>
                    <TableCell>
                      {c.completedApplications} / {c.requiredApplications}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {c.lastActivityDate ? `${daysSince(c.lastActivityDate) ?? "—"} days ago` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/staff/work-coach/claimants/${c.id}`)}
                        className="gap-2"
                      >
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

