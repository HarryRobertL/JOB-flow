/**
 * SettingsPage Component
 * 
 * Settings page for claimants to manage profile and automation preferences.
 */

import * as React from "react"
import { apiGet, apiPut } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormErrorSummary, type FormError } from "@/components/forms"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { PageHeader, ErrorState } from "@/components/shared"
import { Save, Loader2 } from "lucide-react"

/** Profile shape returned by GET /api/claimant/profile and sent in PUT. */
interface ProfileData {
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  location?: string
  postcode?: string
  city?: string
  address?: string
  preferredJobTypes?: string[]
  preferredLocations?: string[]
  salaryMin?: number
  remotePreference?: string
  maxCommuteDistance?: number
  autoApplyEnabled?: boolean
  dailyCap?: number
  requireReview?: boolean
  discoverOnly?: boolean
  requiredApplicationsPerWeek?: number
  cvPath?: string
  coverLetterTemplate?: string
}

export const SettingsPage: React.FC = () => {
  const [profile, setProfile] = React.useState<ProfileData>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formErrors, setFormErrors] = React.useState<FormError[]>([])
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  React.useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await apiGet<ProfileData>("/api/claimant/profile")
      setProfile({
        ...data,
        remotePreference: data.remotePreference ?? "any",
        maxCommuteDistance: data.maxCommuteDistance ?? 25,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
    // Clear errors for this field
    setFormErrors((prev) => prev.filter((e) => e.field !== field))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setFormErrors([])
    setSaveSuccess(false)
    setError(null)

    try {
      await apiPut<{ status: string; message: string }>("/api/claimant/profile", profile)
      setSaveSuccess(true)
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save settings"
      setFormErrors([
        {
          field: "submit",
          message: errorMessage,
          id: "submit-error",
        },
      ])
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Profile and job search settings"
          description="Loading your settings..."
        />
        <div className="space-y-4">
          <div className="h-32 bg-neutral-100 rounded-lg animate-pulse" />
          <div className="h-64 bg-neutral-100 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  const hasProfileData = profile.email != null || profile.firstName != null
  if (error && !isLoading && !hasProfileData) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile and job search settings" />
        <ErrorState
          title="Unable to load settings"
          message={error}
          onRetry={fetchProfile}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      <PageHeader
        title="Profile and job search settings"
        description="Manage your personal information, job preferences, and automation settings. Update your profile details, preferred job types, and how JobFlow submits applications on your behalf."
      />

      {formErrors.length > 0 && (
        <FormErrorSummary errors={formErrors} />
      )}

      {saveSuccess && (
        <Card className="border-success-200 bg-success-50">
          <CardContent className="pt-6">
            <p className="text-success-800">Settings saved successfully!</p>
          </CardContent>
        </Card>
      )}

      {/* Personal information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>
            Your name and contact details. These are used when applying to jobs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First name" name="firstName" id="firstName">
              <Input
                value={profile.firstName ?? ""}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="First name"
              />
            </FormField>
            <FormField label="Last name" name="lastName" id="lastName">
              <Input
                value={profile.lastName ?? ""}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="Last name"
              />
            </FormField>
          </div>
          <FormField label="Email" name="email" id="email" description="Used for job applications and account recovery">
            <Input
              type="email"
              value={profile.email ?? ""}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="you@example.com"
            />
          </FormField>
          <FormField label="Phone" name="phone" id="phone">
            <Input
              type="tel"
              value={profile.phone ?? ""}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="Phone number"
            />
          </FormField>
          <FormField label="Postcode" name="postcode" id="postcode">
            <Input
              value={profile.postcode ?? ""}
              onChange={(e) => updateField("postcode", e.target.value)}
              placeholder="Postcode"
            />
          </FormField>
          <FormField label="Location" name="location" id="location" description="Town or city for job search">
            <Input
              value={profile.location ?? ""}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g. Manchester"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>
            Configure how JobFlow handles job applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <Label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.autoApplyEnabled || false}
                onChange={(e) => updateField("autoApplyEnabled", e.target.checked)}
                className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium">Enable automatic application</span>
            </Label>
            <p className="mt-2 text-xs text-text-secondary ml-6">
              When enabled, JobFlow will automatically submit applications for jobs that match your criteria.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <Label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.discoverOnly || false}
                onChange={(e) => updateField("discoverOnly", e.target.checked)}
                className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium">Only discover jobs on the next run (do not apply automatically)</span>
            </Label>
            <p className="mt-2 text-xs text-text-secondary ml-6">
              When enabled, JobFlow will only find and queue jobs without submitting applications. You can review and approve jobs later from the Jobs page.
            </p>
          </div>

          {profile.autoApplyEnabled && !profile.discoverOnly && (
            <>
              <div className="ml-6 rounded-lg border border-neutral-200 bg-white p-4">
                <Label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.requireReview || false}
                    onChange={(e) => updateField("requireReview", e.target.checked)}
                    className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium">Require manual review</span>
                </Label>
                <p className="mt-1 text-xs text-text-secondary ml-6">
                  When enabled, you must review and approve each application before it's submitted.
                </p>
              </div>

              <FormField
                label="Daily application cap"
                name="dailyCap"
                id="dailyCap"
                description="Maximum number of applications per day (leave empty for no limit)"
              >
                <Input
                  type="number"
                  min="1"
                  value={profile.dailyCap || ""}
                  onChange={(e) =>
                    updateField("dailyCap", e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="15"
                />
              </FormField>
            </>
          )}
        </CardContent>
      </Card>

      {/* Job Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Job Preferences</CardTitle>
          <CardDescription>
            Set your job search criteria and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            label="Weekly application target"
            name="requiredApplicationsPerWeek"
            id="requiredApplicationsPerWeek"
            description="Your work coach may agree a different target with you; this is the number shown on your dashboard and compliance log."
          >
            <Input
              type="number"
              min="1"
              max="100"
              value={profile.requiredApplicationsPerWeek ?? 10}
              onChange={(e) =>
                updateField("requiredApplicationsPerWeek", e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              placeholder="10"
            />
          </FormField>

          <FormField
            label="Remote work preference"
            name="remotePreference"
            id="remotePreference"
          >
            <Select
              value={profile.remotePreference || "any"}
              onChange={(e) => updateField("remotePreference", e.target.value)}
            >
              <option value="any">Any (remote, hybrid, or onsite)</option>
              <option value="remote">Remote only</option>
              <option value="hybrid">Hybrid (mix of remote and onsite)</option>
              <option value="onsite">Onsite only</option>
            </Select>
          </FormField>

          <FormField
            label="Maximum commute distance"
            name="maxCommuteDistance"
            id="maxCommuteDistance"
            description="Maximum distance you're willing to commute (in kilometers)"
          >
            <Input
              type="number"
              min="1"
              max="100"
              value={profile.maxCommuteDistance || 25}
              onChange={(e) =>
                updateField("maxCommuteDistance", parseInt(e.target.value) || 25)
              }
            />
          </FormField>

          <FormField
            label="Minimum salary (optional)"
            name="salaryMin"
            id="salaryMin"
            description="Minimum annual salary in GBP"
          >
            <Input
              type="number"
              min="0"
              value={profile.salaryMin || ""}
              onChange={(e) =>
                updateField("salaryMin", e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="22000"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* File Paths */}
      <Card>
        <CardHeader>
          <CardTitle>Document Paths</CardTitle>
          <CardDescription>
            Paths to your CV and cover letter template files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            label="CV file path"
            name="cvPath"
            id="cvPath"
            description="Full path to your CV PDF file"
          >
            <Input
              type="text"
              value={profile.cvPath || ""}
              onChange={(e) => updateField("cvPath", e.target.value)}
              placeholder="/path/to/your/cv.pdf"
            />
          </FormField>

          <FormField
            label="Cover letter template path"
            name="coverLetterTemplate"
            id="coverLetterTemplate"
            description="Full path to your cover letter template file"
          >
            <Input
              type="text"
              value={profile.coverLetterTemplate || ""}
              onChange={(e) => updateField("coverLetterTemplate", e.target.value)}
              placeholder="/path/to/cover_letter_template.md"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

