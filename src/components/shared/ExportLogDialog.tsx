/**
 * ExportLogDialog Component
 * 
 * Dialog for exporting or sharing the job search log.
 * Supports CSV export and sharing options.
 */

import * as React from "react"
import { Download, Share2, FileText, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogProps,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { FormField } from "@/components/forms"
import { useAnalytics } from "@/lib/useAnalytics"

export interface ExportLogDialogProps extends Omit<DialogProps, "children"> {
  /** Callback when export is requested */
  onExport?: (format: "csv" | "json" | "pdf", dateRange?: { start: string; end: string }) => void
  /** Callback when share is requested */
  onShare?: (method: "email" | "link") => void
  /** Whether export is in progress */
  isExporting?: boolean
  /** Default date range (e.g., current compliance week) */
  defaultDateRange?: { start: string; end: string }
}

export const ExportLogDialog: React.FC<ExportLogDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  onShare,
  isExporting = false,
}) => {
  const { track } = useAnalytics()
  const [format, setFormat] = React.useState<"csv" | "json" | "pdf">("csv")
  const [dateRange, setDateRange] = React.useState<{ start: string; end: string }>({
    start: "",
    end: "",
  })
  const [shareMethod, setShareMethod] = React.useState<"email" | "link">("email")

  const handleExport = async () => {
    const hasDateRange = !!(dateRange.start && dateRange.end)
    await track({
      event: "log_exported" as const,
      format,
      hasDateRange,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    } as any)
    onExport?.(format, hasDateRange ? dateRange : undefined)
  }

  const handleShare = async () => {
    await track({
      event: "log_exported" as const,
      format: "csv" as const,
      hasDateRange: !!(dateRange.start && dateRange.end),
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
      shareMethod,
    } as any)
    onShare?.(shareMethod)
  }

  const today = new Date().toISOString().split("T")[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export or share job search log
          </DialogTitle>
          <DialogDescription>
            Export a compliance report for this claimant. If no date range is selected, the report will default to the current compliance week. Choose CSV for Excel, JSON for data, or PDF for printing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export log
            </h3>

            <FormField
              label="File format"
              name="format"
              id="format"
            >
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as "csv" | "json" | "pdf")}
              >
                <option value="csv">CSV (Excel compatible)</option>
                <option value="json">JSON (for developers)</option>
                <option value="pdf">PDF (for printing)</option>
              </Select>
            </FormField>

            <div className="space-y-3">
              <p className="text-xs font-medium text-text-secondary">Date range (optional)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Start date"
                  name="startDate"
                  id="startDate"
                  description="Leave empty for all records"
                >
                  <input
                    type="date"
                    max={today}
                    value={dateRange.start}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-border-default bg-surface-DEFAULT px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  />
                </FormField>

                <FormField
                  label="End date"
                  name="endDate"
                  id="endDate"
                  description="Leave empty for all records"
                >
                  <input
                    type="date"
                    max={today}
                    min={dateRange.start || undefined}
                    value={dateRange.end}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-border-default bg-surface-DEFAULT px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  />
                </FormField>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateRange({ start: thirtyDaysAgo, end: today })
                }}
                className="text-xs"
              >
                Last 30 days
              </Button>
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export log"}
            </Button>
          </div>

          {/* Share Section */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share with work coach
            </h3>

            <FormField
              label="Share method"
              name="shareMethod"
              id="shareMethod"
            >
              <Select
                value={shareMethod}
                onChange={(e) => setShareMethod(e.target.value as "email" | "link")}
              >
                <option value="email">Email link</option>
                <option value="link">Generate shareable link</option>
              </Select>
            </FormField>

            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full"
            >
              {shareMethod === "email" ? (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send via email
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Generate link
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

