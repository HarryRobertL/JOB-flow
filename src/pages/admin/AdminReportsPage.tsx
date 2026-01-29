/**
 * Admin Reports
 *
 * View and export compliance reports with custom date ranges and cohort filters.
 */

import * as React from "react"
import { apiGet } from "@/lib/apiClient"
import { PageHeader, ErrorState, KPICard } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/contexts/ToastContext"
import { Loader2, Download, FileText } from "lucide-react"

interface ReportData {
  fromDate: string | null
  toDate: string | null
  cohortFilter: string | null
  totalClaimants: number
  pilotCount: number
  controlCount: number
  unsetCount: number
  totalApplications: number
  compliantClaimants: number
  requiredPerWeek: number
}

export const AdminReportsPage: React.FC = () => {
  const { showToast } = useToast()
  const [data, setData] = React.useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [cohort, setCohort] = React.useState("")

  const fetchReport = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.set("from_date", fromDate)
      if (toDate) params.set("to_date", toDate)
      if (cohort) params.set("cohort", cohort)
      const res = await apiGet<ReportData>(`/api/staff/admin/reports?${params.toString()}`)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report")
    } finally {
      setIsLoading(false)
    }
  }, [fromDate, toDate, cohort])

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams()
      if (fromDate) params.set("from_date", fromDate)
      if (toDate) params.set("to_date", toDate)
      if (cohort) params.set("cohort", cohort)
      params.set("format", "csv")
      const baseUrl = import.meta.env.VITE_API_BASE_URL || ""
      const url = `${baseUrl}/api/staff/admin/reports/export?${params.toString()}`
      const response = await fetch(url, { credentials: "include" })
      if (!response.ok) throw new Error("Export failed")
      const blob = await response.blob()
      const filename = `admin_report_${fromDate || "all"}_${toDate || "all"}.csv`
      const link = document.createElement("a")
      link.href = window.URL.createObjectURL(blob)
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(link.href)
      showToast({ title: "Report exported", variant: "success" })
    } catch (err) {
      showToast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="View and export compliance reports, activity summaries, and DWP-facing analytics. Set date range and cohort to filter."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Date range and cohort filter. Leave empty for all data.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              fetchReport()
            }}
            className="flex flex-wrap items-end gap-4"
          >
            <div className="space-y-1">
              <Label htmlFor="report-from">From date</Label>
              <Input
                id="report-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="report-to">To date</Label>
              <Input
                id="report-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="report-cohort">Cohort</Label>
              <select
                id="report-cohort"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                className="flex h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All</option>
                <option value="pilot">Pilot</option>
                <option value="control">Control</option>
              </select>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Run report
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && !data && (
        <ErrorState title="Unable to load report" message={error} onRetry={fetchReport} />
      )}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              {data.fromDate || data.toDate
                ? `Period: ${data.fromDate || "start"} to ${data.toDate || "end"}`
                : "All time"}
              {data.cohortFilter && ` · Cohort: ${data.cohortFilter}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Total claimants"
                value={data.totalClaimants}
                variant="default"
                icon={<FileText className="h-3 w-3" />}
              />
              <KPICard
                title="Pilot"
                value={data.pilotCount}
                variant="info"
              />
              <KPICard
                title="Control"
                value={data.controlCount}
                variant="default"
              />
              <KPICard
                title="Unset cohort"
                value={data.unsetCount}
                variant="default"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KPICard
                title="Total applications"
                value={data.totalApplications}
                variant="success"
              />
              <KPICard
                title="Compliant claimants"
                value={data.compliantClaimants}
                variant="success"
              />
              <KPICard
                title="Required per week"
                value={data.requiredPerWeek}
                variant="default"
              />
            </div>
            <Button variant="outline" onClick={handleExportCsv} className="gap-2">
              <Download className="h-4 w-4" />
              Export as CSV
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
