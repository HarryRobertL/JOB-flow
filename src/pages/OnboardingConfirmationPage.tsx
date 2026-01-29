/**
 * OnboardingConfirmationPage Component
 * 
 * Confirmation screen shown after completing onboarding.
 * Summarizes profile and explains next steps.
 */

import * as React from "react"
import { CheckCircle, Settings, FileText, MapPin, Briefcase } from "lucide-react"
import { AppShell } from "@/components/layout/AppShell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ProfileDraft } from "@/types/onboarding"

/** Data accepted for confirmation display (ProfileDraft or legacy shape) */
export type OnboardingConfirmationData = Partial<ProfileDraft> & {
  preferredJobTypes?: string[]
  maxCommuteDistance?: number
  autoApplyEnabled?: boolean
  dailyCap?: number
  requireReview?: boolean
}

export interface OnboardingConfirmationPageProps {
  formData?: OnboardingConfirmationData
  onEdit?: () => void
  onComplete?: () => void
}

export const OnboardingConfirmationPage: React.FC<OnboardingConfirmationPageProps> = ({
  formData,
  onEdit,
  onComplete,
}) => {
  if (!formData) {
    return (
      <AppShell appTitle="JobFlow" userName="User">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-text-secondary">No profile data found. Please start the onboarding process.</p>
        </div>
      </AppShell>
    )
  }

  const firstName = formData.firstName
  const lastName = formData.lastName
  const email = formData.email
  const phone = formData.phone
  const location = formData.location
  const postcode = formData.postcode
  const maxCommute = formData.maxCommuteKm ?? (formData as OnboardingConfirmationData).maxCommuteDistance
  const jobTypes = formData.desiredJobTypes ?? (formData as OnboardingConfirmationData).preferredJobTypes
  const remotePref = formData.remotePreference
  const autoApply =
    formData.automationMode != null
      ? formData.automationMode === "auto_apply"
      : Boolean((formData as OnboardingConfirmationData).autoApplyEnabled)

  return (
    <AppShell
      appTitle="JobFlow"
      userName={firstName || "User"}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-success-100 p-4">
              <CheckCircle className="h-12 w-12 text-success-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Setup complete!</h1>
          <p className="text-lg text-text-secondary">
            Your profile has been configured successfully
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your profile summary</CardTitle>
            <CardDescription>Review the information we've saved</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                  <FileText className="h-4 w-4" />
                  Personal information
                </div>
                <div className="text-sm text-text-primary">
                  <p>{firstName} {lastName}</p>
                  <p className="text-text-secondary">{email}</p>
                  <p className="text-text-secondary">{phone}</p>
                  <p className="text-text-secondary">{location}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                  <MapPin className="h-4 w-4" />
                  Location
                </div>
                <div className="text-sm text-text-primary">
                  <p>{location}</p>
                  {postcode && <p className="text-text-secondary">Postcode: {postcode}</p>}
                  {maxCommute != null && (
                    <p className="text-text-secondary">Max commute: {maxCommute} miles</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                  <Briefcase className="h-4 w-4" />
                  Job preferences
                </div>
                <div className="text-sm text-text-primary space-y-2">
                  {jobTypes && jobTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {jobTypes.map((t: string) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {remotePref && (
                    <p className="text-text-secondary">
                      Remote preference: {remotePref.replace("_", " ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                  <Settings className="h-4 w-4" />
                  Automation settings
                </div>
                <div className="text-sm text-text-primary space-y-1">
                  <p>
                    Auto-apply: {autoApply ? "Enabled" : "Disabled"}
                  </p>
                  {(formData.dailyApplicationCap ?? formData.dailyCap) != null && (
                    <p className="text-text-secondary">Daily cap: {formData.dailyApplicationCap ?? formData.dailyCap} applications</p>
                  )}
                  <p>
                    Review required: {formData.automationMode === "review_first" || formData.requireReview ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle className="text-primary-900">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-primary-800">
            <div className="space-y-3">
              <div>
                <p className="font-semibold">1. Job search begins</p>
                <p className="text-primary-700">
                  JobFlow will start searching for jobs that match your preferences and criteria.
                </p>
              </div>
              <div>
                <p className="font-semibold">2. Application process</p>
                <p className="text-primary-700">
                  {autoApply
                    ? "Applications will be automatically submitted for jobs that match your criteria."
                    : "You'll receive notifications to review applications before they're submitted."}
                </p>
              </div>
              <div>
                <p className="font-semibold">3. Compliance logging</p>
                <p className="text-primary-700">
                  All application activity is automatically logged for your work coach to review.
                  You can view your activity log at any time from your dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning-200 bg-warning-50">
          <CardHeader>
            <CardTitle className="text-warning-900">Managing your preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-warning-800">
            <p>
              You can change your automation preferences at any time:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Enable or disable automatic applications</li>
              <li>Change your daily application cap</li>
              <li>Update your job search criteria</li>
              <li>Modify your profile information</li>
            </ul>
            <p className="pt-2">
              <strong>To stop automation:</strong> Go to Settings in your dashboard and disable automatic applications.
              You can also pause individual job searches from the dashboard.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          {onEdit && (
            <Button
              variant="outline"
              onClick={onEdit}
            >
              Edit profile
            </Button>
          )}
          {onComplete && (
            <Button
              onClick={onComplete}
            >
              Go to dashboard
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  )
}

