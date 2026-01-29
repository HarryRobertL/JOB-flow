/**
 * WorkCoachReportsPage
 *
 * Work-coach reports and exports for claimant appointments.
 * Uses existing backend export endpoint.
 */

import * as React from "react"
import { apiGet } from "@/lib/apiClient"
import { PageHeader, ErrorState, EmptyState } from "@/components/shared"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"

interface ClaimantRow {
  id: string
  name: string
  complianceStatus: string
  requiredApplications: number
  completedApplications: number
  applicationsThisWeek: number
}

interface WorkCoachClaimantsResponse {
  claimants: ClaimantRow[]
  totalClaimants: number
}

export const WorkCoachReportsPage: React.FC = () => {
  const { showToast } = useToast()
  const [claimants, setClaimants] = React.useState<ClaimantRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

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

  const handleExport = async (claimantId: string) => {
    try {
      const params = new URLSearchParams()
      params.set("claimant_id", claimantId)
      params.set("format", "csv")
      if (dateFrom) params.set("start_date", dateFrom)
      if (dateTo) params.set("end_date", dateTo)

      const baseUrl = import.meta.env.VITE_API_BASE_URL || ""
      const url = `${baseUrl}/api/staff/work-coach/reports/export?${params.toString()}`
      const response = await fetch(url, { credentials: "include", method: "GET" })
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `claimant_report_${claimantId}_${dateFrom || "all"}_${dateTo || "all"}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      showToast({ title: "Report downloaded", variant: "success" })
    } catch (err) {
      showToast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Loading…" />
        <div className="h-48 bg-neutral-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" />
        <ErrorState title="Unable to load reports" message={error} onRetry={fetchClaimants} />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="work-coach-reports-page">
      <PageHeader
        title="Reports"
        description="Download claimant activity and compliance reports for appointments. Reports are CSV and can be opened in Excel."
      />

      <Card>
        <CardHeader>
          <CardTitle>Date range (optional)</CardTitle>
          <CardDescription>Leave blank to export all available activity.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary" htmlFor="from">
              From
            </label>
            <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary" htmlFor="to">
              To
            </label>
            <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {claimants.length === 0 ? (
        <EmptyState title="No claimants found" description="You don’t have any assigned claimants yet." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Assigned claimants</CardTitle>
            <CardDescription>Select a claimant to export a report.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>This week</TableHead>
                  <TableHead className="w-40">
                    <span className="sr-only">Export</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claimants.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="capitalize">{c.complianceStatus.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      {c.completedApplications} / {c.requiredApplications}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleExport(c.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
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

