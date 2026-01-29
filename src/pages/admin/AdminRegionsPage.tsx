/**
 * Admin Regions and Jobcentres
 *
 * Manage regions and jobcentres for reporting and filters.
 */

import * as React from "react"
import { apiGet, apiPut } from "@/lib/apiClient"
import { PageHeader, ErrorState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/contexts/ToastContext"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface RegionRow {
  id: string
  name: string
  jobcentres: string[]
}

export const AdminRegionsPage: React.FC = () => {
  const { showToast } = useToast()
  const [regions, setRegions] = React.useState<RegionRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchRegions = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiGet<{ regions: RegionRow[] }>("/api/staff/admin/regions")
      setRegions(Array.isArray(res.regions) ? res.regions : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load regions")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchRegions()
  }, [fetchRegions])

  const updateRegion = (index: number, field: "name" | "jobcentres", value: string | string[]) => {
    setRegions((prev) => {
      const next = [...prev]
      const r = { ...next[index], [field]: value }
      next[index] = r
      return next
    })
  }

  const addJobcentre = (regionIndex: number) => {
    setRegions((prev) => {
      const next = [...prev]
      const jc = [...(next[regionIndex].jobcentres || []), ""]
      next[regionIndex] = { ...next[regionIndex], jobcentres: jc }
      return next
    })
  }

  const removeJobcentre = (regionIndex: number, jcIndex: number) => {
    setRegions((prev) => {
      const next = [...prev]
      const jc = [...(next[regionIndex].jobcentres || [])]
      jc.splice(jcIndex, 1)
      next[regionIndex] = { ...next[regionIndex], jobcentres: jc }
      return next
    })
  }

  const updateJobcentre = (regionIndex: number, jcIndex: number, value: string) => {
    setRegions((prev) => {
      const next = [...prev]
      const jc = [...(next[regionIndex].jobcentres || [])]
      jc[jcIndex] = value
      next[regionIndex] = { ...next[regionIndex], jobcentres: jc }
      return next
    })
  }

  const addRegion = () => {
    setRegions((prev) => [
      ...prev,
      { id: `region-${Date.now()}`, name: "", jobcentres: [] },
    ])
  }

  const removeRegion = (index: number) => {
    setRegions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload = regions
        .filter((r) => (r.name || "").trim())
        .map((r) => ({
          id: r.id,
          name: (r.name || "").trim(),
          jobcentres: (r.jobcentres || []).filter((j) => (j || "").trim()).map((j) => j.trim()),
        }))
      await apiPut<{ regions: RegionRow[] }>("/api/staff/admin/regions", { regions: payload })
      showToast({ title: "Regions saved", variant: "success" })
      fetchRegions()
    } catch (err) {
      showToast({
        title: "Failed to save regions",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (error && regions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Regions" description="Manage regions and jobcentres for reporting and assignment." />
        <ErrorState title="Unable to load regions" message={error} onRetry={fetchRegions} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regions"
        description="Manage regions and jobcentres. These appear in filters and reports for work coaches and DWP."
      />

      <Card>
        <CardHeader>
          <CardTitle>Regions and jobcentres</CardTitle>
          <CardDescription>
            Add or edit regions and their jobcentre list. Empty name rows are ignored on save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-text-secondary py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {regions.map((region, rIdx) => (
                <div
                  key={region.id}
                  className="rounded-lg border border-border-default p-4 space-y-3 bg-surface-subtle"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex-1 min-w-[120px]">
                      <Label htmlFor={`region-name-${rIdx}`}>Region name</Label>
                      <Input
                        id={`region-name-${rIdx}`}
                        value={region.name}
                        onChange={(e) => updateRegion(rIdx, "name", e.target.value)}
                        placeholder="e.g. Wales"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRegion(rIdx)}
                      className="text-destructive hover:text-destructive mt-6"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="block mb-2">Jobcentres</Label>
                    <div className="space-y-2">
                      {(region.jobcentres || []).map((jc, jIdx) => (
                        <div key={jIdx} className="flex gap-2">
                          <Input
                            value={jc}
                            onChange={(e) => updateJobcentre(rIdx, jIdx, e.target.value)}
                            placeholder="Jobcentre name"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeJobcentre(rIdx, jIdx)}
                            aria-label="Remove jobcentre"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addJobcentre(rIdx)}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add jobcentre
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={addRegion} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add region
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save all"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
