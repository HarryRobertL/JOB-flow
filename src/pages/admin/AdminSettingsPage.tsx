/**
 * Admin System Settings
 *
 * Configure default compliance thresholds and regime levels.
 */

import * as React from "react"
import { apiGet, apiPut } from "@/lib/apiClient"
import { PageHeader, ErrorState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/contexts/ToastContext"
import { Loader2, Save } from "lucide-react"

interface SystemSettings {
  default_required_applications_per_week: number
  regime_levels: string[]
}

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useToast()
  const [settings, setSettings] = React.useState<SystemSettings | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [defaultRequired, setDefaultRequired] = React.useState(10)
  const [regimeLevelsText, setRegimeLevelsText] = React.useState("standard, intensive, light_touch")

  const fetchSettings = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiGet<SystemSettings>("/api/staff/admin/settings")
      setSettings(res)
      setDefaultRequired(res.default_required_applications_per_week ?? 10)
      setRegimeLevelsText(
        Array.isArray(res.regime_levels)
          ? res.regime_levels.join(", ")
          : "standard, intensive, light_touch"
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const regime_levels = regimeLevelsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      await apiPut<SystemSettings>("/api/staff/admin/settings", {
        default_required_applications_per_week: defaultRequired,
        regime_levels: regime_levels.length > 0 ? regime_levels : ["standard"],
      })
      showToast({ title: "Settings saved", variant: "success" })
      fetchSettings()
    } catch (err) {
      showToast({
        title: "Failed to save settings",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (error && !settings) {
    return (
      <div className="space-y-6">
        <PageHeader title="System settings" />
        <ErrorState title="Unable to load settings" message={error} onRetry={fetchSettings} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System settings"
        description="Configure default compliance thresholds, regime levels, and global requirements. These apply when a claimant has not set their own target."
      />

      <Card>
        <CardHeader>
          <CardTitle>Default compliance</CardTitle>
          <CardDescription>
            Default weekly application target used for new claimants and when a claimant has not set a target.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 max-w-md">
              <div>
                <Label htmlFor="default-required">Default applications per week</Label>
                <Input
                  id="default-required"
                  type="number"
                  min={1}
                  max={100}
                  value={defaultRequired}
                  onChange={(e) => setDefaultRequired(parseInt(e.target.value, 10) || 10)}
                  className="mt-1"
                />
                <p className="text-xs text-text-tertiary mt-1">Used when a claimant has not set their own target (1–100).</p>
              </div>
              <div>
                <Label htmlFor="regime-levels">Regime levels</Label>
                <Input
                  id="regime-levels"
                  type="text"
                  value={regimeLevelsText}
                  onChange={(e) => setRegimeLevelsText(e.target.value)}
                  placeholder="standard, intensive, light_touch"
                  className="mt-1"
                />
                <p className="text-xs text-text-tertiary mt-1">Comma-separated list of regime level labels.</p>
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save settings
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
