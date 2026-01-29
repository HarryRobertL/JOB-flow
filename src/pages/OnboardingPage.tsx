/**
 * OnboardingPage
 *
 * Full-screen multi-step wizard for claimants.
 * Steps: About you, Experience and skills, Job preferences, Automation settings, Review.
 * Wired to PUT /api/claimant/profile and analytics.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormErrorSummary, type FormError } from "@/components/forms"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { OnboardingStepper } from "@/components/shared/OnboardingStepper"
import { useAnalytics } from "@/lib/useAnalytics"
import type { OnboardingCompletedEvent, OnboardingStepCompletedEvent } from "@/lib/analytics"
import { apiPut, apiPost, getClaimantProfile } from "@/lib/apiClient"
import { useToast } from "@/contexts/ToastContext"
import { useAuth } from "@/contexts/AuthContext"
import type { OnboardingStep, ProfileDraft, ProfileUpdatePayload } from "@/types/onboarding"
import {
  ONBOARDING_STEP_ORDER,
  ONBOARDING_STEP_LABELS,
} from "@/types/onboarding"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

const DEFAULT_DRAFT: ProfileDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  postcode: "",
  location: "",
  employmentStatus: "",
  yearsExperience: "",
  lastRoleTitle: "",
  skillsTags: [],
  noticePeriod: "",
  rightToWorkConfirmed: false,
  desiredJobTypes: [],
  locations: [],
  maxCommuteKm: 25,
  remotePreference: "any",
  minimumPay: undefined,
  automationMode: "review_first",
  dailyApplicationCap: 15,
  allowedPlatforms: ["indeed", "greenhouse", "lever"],
  excludeKeywords: "",
  consentCheckbox: false,
}

const JOB_TYPES = [
  "Retail", "Customer service", "Warehouse", "Admin", "Sales", "Receptionist",
  "Data entry", "Care", "Hospitality", "Driver", "Other",
]

const REMOTE_OPTIONS: { value: ProfileDraft["remotePreference"]; label: string }[] = [
  { value: "any", label: "No preference" },
  { value: "mostly_in_person", label: "Mostly in person" },
  { value: "mostly_remote", label: "Mostly remote" },
]

const COMMUTE_OPTIONS = [
  { value: 5, label: "Local (up to 5 miles)" },
  { value: 10, label: "Up to 10 miles" },
  { value: 25, label: "Up to 25 miles" },
  { value: 50, label: "Up to 50 miles" },
]

function draftToPayload(d: ProfileDraft): ProfileUpdatePayload {
  return {
    email: d.email || undefined,
    firstName: d.firstName || undefined,
    lastName: d.lastName || undefined,
    phone: d.phone || undefined,
    location: d.location || d.postcode || undefined,
    postcode: d.postcode || undefined,
    city: d.location || undefined,
    preferredJobTypes: d.desiredJobTypes.length ? d.desiredJobTypes : undefined,
    preferredLocations: d.locations.length ? d.locations : undefined,
    salaryMin: d.minimumPay,
    remotePreference: d.remotePreference === "any" ? "any" : d.remotePreference === "mostly_remote" ? "remote" : "onsite",
    maxCommuteDistance: d.maxCommuteKm,
    autoApplyEnabled: d.automationMode === "auto_apply",
    requireReview: d.automationMode === "review_first",
    dailyCap: d.dailyApplicationCap,
    cvPath: d.cvPath,
    coverLetterTemplate: d.coverLetterTemplate,
  }
}

export const OnboardingPage: React.FC = () => {
  const { track } = useAnalytics()
  const { showToast } = useToast()
  const { user, setClaimantOnboardingComplete } = useAuth()
  const navigate = useNavigate()
  const startTimeRef = React.useRef<number>(Date.now())
  const [step, setStep] = React.useState<OnboardingStep>("about")
  const [draft, setDraft] = React.useState<ProfileDraft>(DEFAULT_DRAFT)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [formErrors, setFormErrors] = React.useState<FormError[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true)
  const [isSkipping, setIsSkipping] = React.useState(false)

  const updateDraft = (updates: Partial<ProfileDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }))
    setErrors((prev) => {
      const next = { ...prev }
      Object.keys(updates).forEach((k) => delete next[k])
      return next
    })
  }

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      const profile = await getClaimantProfile()
      if (cancelled || !profile) {
        if (!cancelled) setIsLoadingProfile(false)
        return
      }
      setDraft((prev) => ({
        ...prev,
        email: (profile.email as string) ?? prev.email,
        firstName: (profile.firstName as string) ?? prev.firstName,
        lastName: (profile.lastName as string) ?? prev.lastName,
        phone: (profile.phone as string) ?? prev.phone,
        postcode: (profile.postcode as string) ?? prev.postcode,
        location: (profile.location as string) ?? (profile.city as string) ?? prev.location,
      }))
      setIsLoadingProfile(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    if (user?.email && !draft.email) {
      setDraft((prev) => ({ ...prev, email: user.email }))
    }
  }, [user?.email, draft.email])

  const stepIndex = ONBOARDING_STEP_ORDER.indexOf(step)
  const goToStep = (s: OnboardingStep) => {
    setStep(s)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const validateAbout = (): boolean => {
    const e: Record<string, string> = {}
    if (!draft.firstName?.trim()) e.firstName = "First name is required"
    if (!draft.lastName?.trim()) e.lastName = "Last name is required"
    if (!draft.email?.trim()) e.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) e.email = "Enter a valid email address"
    if (!draft.postcode?.trim()) e.postcode = "Postcode is required"
    setErrors(e)
    setFormErrors(Object.entries(e).map(([field, message]) => ({ field, message, id: field })))
    return Object.keys(e).length === 0
  }

  const validateExperience = (): boolean => {
    const e: Record<string, string> = {}
    if (!draft.noticePeriod) e.noticePeriod = "Notice period is required"
    if (!draft.rightToWorkConfirmed) e.rightToWorkConfirmed = "Please confirm your right to work in the UK"
    setErrors(e)
    setFormErrors(Object.entries(e).map(([field, message]) => ({ field, message, id: field })))
    return Object.keys(e).length === 0
  }

  const validatePreferences = (): boolean => {
    const e: Record<string, string> = {}
    if (!draft.desiredJobTypes?.length) e.desiredJobTypes = "Select at least one job type"
    setErrors(e)
    setFormErrors(Object.entries(e).map(([field, message]) => ({ field, message, id: field })))
    return Object.keys(e).length === 0
  }

  const validateAutomation = (): boolean => {
    const e: Record<string, string> = {}
    const cap = draft.dailyApplicationCap
    if (cap == null || cap < 1 || cap > 200) e.dailyApplicationCap = "Daily cap must be between 1 and 200"
    if (!draft.consentCheckbox) e.consentCheckbox = "You must agree to the terms before continuing"
    setErrors(e)
    setFormErrors(Object.entries(e).map(([field, message]) => ({ field, message, id: field })))
    return Object.keys(e).length === 0
  }

  const runStepValidation = (): boolean => {
    switch (step) {
      case "about": return validateAbout()
      case "experience": return validateExperience()
      case "preferences": return validatePreferences()
      case "automation": return validateAutomation()
      default: return true
    }
  }

  const handleNext = async () => {
    if (!runStepValidation()) return
    const ev: Omit<OnboardingStepCompletedEvent, "timestamp" | "sessionId"> = {
      event: "onboarding_step_completed",
      step,
    }
    track(ev).catch(() => {})
    const nextIdx = stepIndex + 1
    if (nextIdx < ONBOARDING_STEP_ORDER.length) {
      goToStep(ONBOARDING_STEP_ORDER[nextIdx])
    }
  }

  const handleBack = () => {
    if (stepIndex > 0) goToStep(ONBOARDING_STEP_ORDER[stepIndex - 1])
  }

  const handleFinish = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setFormErrors([])
    try {
      const payload = draftToPayload(draft)
      await apiPut<{ status: string }>("/api/claimant/profile", payload)
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const event: Omit<OnboardingCompletedEvent, "timestamp" | "sessionId"> = {
        event: "onboarding_completed",
        totalSteps: ONBOARDING_STEP_ORDER.length,
        durationSeconds,
        autoApplyEnabled: draft.automationMode === "auto_apply",
        requireReview: draft.automationMode === "review_first",
        jobTypesCount: draft.desiredJobTypes?.length ?? 0,
        hasDailyCap: (draft.dailyApplicationCap ?? 0) > 0,
      }
      await track(event)
      setClaimantOnboardingComplete()
      showToast({
        title: "Profile saved",
        description: "Your profile has been set up. Welcome to your dashboard.",
        variant: "success",
      })
      try {
        localStorage.setItem("autoapplyer.justCompletedOnboarding", "true")
      } catch {
        // ignore if localStorage unavailable
      }
      navigate("/app/dashboard?onboarding=completed", { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again."
      setFormErrors([{ field: "submit", message: msg, id: "submit-error" }])
      showToast({ title: "Could not save", description: msg, variant: "error" })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const contextCopy = (): { title: string; body: string; preview?: string } => {
    switch (step) {
      case "about":
        return {
          title: "Why we ask this",
          body: "Your work coach uses your contact details and location to support you and match you to suitable roles. This information is kept secure.",
          preview: draft.firstName || draft.lastName ? `${draft.firstName} ${draft.lastName}`.trim() || "Your name" : undefined,
        }
      case "experience":
        return {
          title: "Why we ask this",
          body: "Skills and availability help JobFlow target the right kinds of jobs and set realistic expectations with your work coach.",
          preview: draft.noticePeriod ? `Notice: ${draft.noticePeriod}` : undefined,
        }
      case "preferences":
        return {
          title: "Why we ask this",
          body: "Job types and location steer which roles the system looks at. They are not a guarantee, but they keep your search focused.",
          preview: draft.desiredJobTypes?.length ? `${draft.desiredJobTypes.length} job type(s)` : undefined,
        }
      case "automation":
        return {
          title: "Why we ask this",
          body: "You stay in control. Choose whether JobFlow only finds jobs for you to review, or can apply within your daily cap. You can change this in Settings anytime.",
          preview: draft.automationMode === "auto_apply" ? "Auto-apply on" : "Review first",
        }
      case "review":
        return {
          title: "Ready to finish",
          body: "Your work coach will see a clear summary of your targets and activity. You can edit any section above before finishing.",
        }
      default:
        return { title: "", body: "" }
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" aria-busy="true" aria-label="Loading your profile">
        <p className="text-text-secondary">Loading…</p>
      </div>
    )
  }

  const handleSkipForNow = async () => {
    setIsSkipping(true)
    try {
      await apiPost<{ status: string; skippedOnboarding?: boolean }>("/api/claimant/skip-onboarding", {})
      setClaimantOnboardingComplete()
      navigate("/app/dashboard", { replace: true })
    } catch {
      showToast({
        title: "Could not skip",
        description: "Something went wrong. Please try again or complete the steps.",
        variant: "error",
      })
    } finally {
      setIsSkipping(false)
    }
  }

  const ctx = contextCopy()

  return (
    <div className="min-h-full flex flex-col lg:flex-row gap-8 lg:gap-12 max-w-6xl mx-auto px-4 py-6" data-testid="onboarding-page">
      <div className="flex-1 min-w-0">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Get started with JobFlow</h1>
            <p className="mt-1 text-sm text-text-secondary">We’ll set up your profile and preferences in a few steps.</p>
          </div>
          <button
            type="button"
            onClick={handleSkipForNow}
            disabled={isSkipping}
            className="text-sm text-text-secondary hover:text-text-primary underline focus:outline-none focus:ring-2 focus:ring-blueAccent focus:ring-offset-2 rounded px-1 self-start sm:mt-0.5 disabled:opacity-50"
          >
            {isSkipping ? "Skipping…" : "Skip for now"}
          </button>
        </header>

        <OnboardingStepper currentStep={step} className="mb-8" />

        <Card className="border-border-default bg-surface-DEFAULT">
          <CardHeader>
            <CardTitle id="onboarding-step-title">{ONBOARDING_STEP_LABELS[step]}</CardTitle>
            <CardDescription id="onboarding-step-desc">
              {step === "about" && "Tell us how to reach you and where you’re based."}
              {step === "experience" && "Skills and availability help match you to the right roles."}
              {step === "preferences" && "Set the kinds of roles and locations you’re looking for."}
              {step === "automation" && "Choose how JobFlow applies on your behalf."}
              {step === "review" && "Check your answers and finish setup."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formErrors.length > 0 && <FormErrorSummary errors={formErrors} />}

            {step === "about" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="First name" id="firstName" required error={errors.firstName}>
                    <Input
                      value={draft.firstName}
                      onChange={(e) => updateDraft({ firstName: e.target.value })}
                      placeholder="John"
                      autoComplete="given-name"
                    />
                  </FormField>
                  <FormField label="Last name" id="lastName" required error={errors.lastName}>
                    <Input
                      value={draft.lastName}
                      onChange={(e) => updateDraft({ lastName: e.target.value })}
                      placeholder="Smith"
                      autoComplete="family-name"
                    />
                  </FormField>
                </div>
                <FormField label="Email" id="email" required error={errors.email} description="We’ll use this for updates.">
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(e) => updateDraft({ email: e.target.value })}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </FormField>
                <FormField label="Phone" id="phone" error={errors.phone}>
                  <Input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => updateDraft({ phone: e.target.value })}
                    placeholder="07xxx xxxxxx"
                    autoComplete="tel"
                  />
                </FormField>
                <FormField label="Postcode" id="postcode" required error={errors.postcode} description="Helps with location matching.">
                  <Input
                    value={draft.postcode}
                    onChange={(e) => updateDraft({ postcode: e.target.value })}
                    placeholder="e.g. SW1A 1AA"
                  />
                </FormField>
                <FormField label="Town or city" id="location" error={errors.location}>
                  <Input
                    value={draft.location}
                    onChange={(e) => updateDraft({ location: e.target.value })}
                    placeholder="e.g. London"
                  />
                </FormField>
              </div>
            )}

            {step === "experience" && (
              <div className="space-y-4">
                <FormField label="Employment status" id="employmentStatus">
                  <Select
                    value={draft.employmentStatus}
                    onChange={(e) => updateDraft({ employmentStatus: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="in_work">In work</option>
                    <option value="not_in_work">Not in work</option>
                    <option value="student">Student</option>
                  </Select>
                </FormField>
                <FormField label="Years of experience" id="yearsExperience" description="Or use the shortcut if you have no recent experience.">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select
                      value={draft.yearsExperience}
                      onChange={(e) => updateDraft({ yearsExperience: e.target.value })}
                    >
                      <option value="">Select</option>
                      <option value="none">No recent experience</option>
                      <option value="0_1">0–1 years</option>
                      <option value="1_3">1–3 years</option>
                      <option value="3_5">3–5 years</option>
                      <option value="5_plus">5+ years</option>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateDraft({ yearsExperience: "none", lastRoleTitle: undefined })}
                      aria-label="Set to no recent experience"
                    >
                      No recent experience
                    </Button>
                  </div>
                </FormField>
                <FormField label="Last job title (optional)" id="lastRoleTitle">
                  <Input
                    value={draft.lastRoleTitle ?? ""}
                    onChange={(e) => updateDraft({ lastRoleTitle: e.target.value || undefined })}
                    placeholder="e.g. Sales assistant"
                  />
                </FormField>
                <FormField label="Skills" id="skillsTags" description="Add one at a time and press Enter.">
                  <SkillsTagInput
                    value={draft.skillsTags}
                    onChange={(tags) => updateDraft({ skillsTags: tags })}
                    placeholder="Type a skill and press Enter"
                  />
                </FormField>
                <FormField label="Notice period" id="noticePeriod" required error={errors.noticePeriod}>
                  <Select
                    value={draft.noticePeriod}
                    onChange={(e) => updateDraft({ noticePeriod: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="immediate">Immediately available</option>
                    <option value="1_week">One week</option>
                    <option value="2_weeks">Two weeks</option>
                    <option value="4_weeks">Four weeks</option>
                    <option value="other">Other</option>
                  </Select>
                </FormField>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="rightToWorkConfirmed"
                    checked={draft.rightToWorkConfirmed}
                    onChange={(e) => updateDraft({ rightToWorkConfirmed: e.target.checked })}
                    className="rounded border-border-default text-primary-500 mt-1"
                    aria-invalid={errors.rightToWorkConfirmed ? "true" : "false"}
                  />
                  <Label htmlFor="rightToWorkConfirmed" className="text-sm font-normal cursor-pointer">
                    I confirm I have the right to work in the UK.
                  </Label>
                </div>
                {errors.rightToWorkConfirmed && (
                  <p className="text-xs text-error-600" role="alert">{errors.rightToWorkConfirmed}</p>
                )}
              </div>
            )}

            {step === "preferences" && (
              <div className="space-y-4">
                <FormField label="Preferred location (optional)" id="locations" description="Town or area. We use your postcode too.">
                  <Input
                    value={draft.locations?.[0] ?? ""}
                    onChange={(e) => updateDraft({ locations: e.target.value.trim() ? [e.target.value.trim()] : [] })}
                    placeholder="e.g. London"
                  />
                </FormField>
                <FormField label="Job types you’re interested in" id="desiredJobTypes" required error={errors.desiredJobTypes} description="Select all that apply. This steers which roles JobFlow looks at, not a guarantee.">
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map((t) => (
                      <label key={t} className="inline-flex items-center gap-2 rounded-md border border-border-default px-3 py-2 cursor-pointer hover:bg-surface-alt">
                        <input
                          type="checkbox"
                          checked={draft.desiredJobTypes.includes(t)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...draft.desiredJobTypes, t]
                              : draft.desiredJobTypes.filter((x) => x !== t)
                            updateDraft({ desiredJobTypes: next })
                          }}
                          className="rounded border-border-default text-primary-500"
                          aria-label={`Select ${t}`}
                        />
                        <span className="text-sm">{t}</span>
                      </label>
                    ))}
                  </div>
                </FormField>
                <FormField label="Maximum commute" id="maxCommuteKm">
                  <Select
                    value={String(draft.maxCommuteKm)}
                    onChange={(e) => updateDraft({ maxCommuteKm: Number(e.target.value) })}
                  >
                    {COMMUTE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Remote preference" id="remotePreference">
                  <div className="space-y-2">
                    {REMOTE_OPTIONS.map((o) => (
                      <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="remotePreference"
                          value={o.value}
                          checked={draft.remotePreference === o.value}
                          onChange={() => updateDraft({ remotePreference: o.value })}
                          className="text-primary-500"
                        />
                        <span className="text-sm">{o.label}</span>
                      </label>
                    ))}
                  </div>
                </FormField>
                <FormField label="Minimum pay (optional)" id="minimumPay" description="In £ per year. Used to steer job matches.">
                  <Input
                    type="number"
                    min={0}
                    value={draft.minimumPay ?? ""}
                    onChange={(e) => updateDraft({ minimumPay: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="e.g. 22000"
                  />
                </FormField>
              </div>
            )}

            {step === "automation" && (
              <div className="space-y-4">
                <FormField label="How should JobFlow apply?" id="automationMode">
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 rounded-lg border border-border-default p-4 cursor-pointer hover:bg-surface-alt">
                      <input
                        type="radio"
                        name="automationMode"
                        value="review_first"
                        checked={draft.automationMode === "review_first"}
                        onChange={() => updateDraft({ automationMode: "review_first" })}
                        className="mt-1 text-primary-500"
                      />
                      <div>
                        <span className="font-medium text-sm">Discover only – I’ll review before applying</span>
                        <p className="text-xs text-text-secondary mt-0.5">JobFlow finds roles and queues them. You approve or reject before any application is sent.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border border-border-default p-4 cursor-pointer hover:bg-surface-alt">
                      <input
                        type="radio"
                        name="automationMode"
                        value="auto_apply"
                        checked={draft.automationMode === "auto_apply"}
                        onChange={() => updateDraft({ automationMode: "auto_apply" })}
                        className="mt-1 text-primary-500"
                      />
                      <div>
                        <span className="font-medium text-sm">Auto-apply within my rules</span>
                        <p className="text-xs text-text-secondary mt-0.5">JobFlow will submit applications automatically up to your daily cap. You can change this in Settings anytime.</p>
                      </div>
                    </label>
                  </div>
                </FormField>
                <FormField label="Daily application cap" id="dailyApplicationCap" required error={errors.dailyApplicationCap} description="Maximum applications per day (1–200).">
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={draft.dailyApplicationCap}
                    onChange={(e) => updateDraft({ dailyApplicationCap: Number(e.target.value) || 15 })}
                  />
                </FormField>
                <FormField label="Job boards to use" id="allowedPlatforms" description="Where JobFlow looks for roles.">
                  <div className="flex flex-wrap gap-2">
                    {["indeed", "greenhouse", "lever"].map((p) => (
                      <label key={p} className="inline-flex items-center gap-2 rounded-md border border-border-default px-3 py-2 cursor-pointer hover:bg-surface-alt">
                        <input
                          type="checkbox"
                          checked={draft.allowedPlatforms.includes(p)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...draft.allowedPlatforms, p]
                              : draft.allowedPlatforms.filter((x) => x !== p)
                            updateDraft({ allowedPlatforms: next })
                          }}
                          className="rounded text-primary-500"
                        />
                        <span className="text-sm capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                </FormField>
                <FormField label="Keywords to avoid (optional)" id="excludeKeywords" description="Comma-separated words or phrases.">
                  <Input
                    value={draft.excludeKeywords}
                    onChange={(e) => updateDraft({ excludeKeywords: e.target.value })}
                    placeholder="e.g. commission only, unpaid"
                  />
                </FormField>
                <div className="rounded-lg border border-border-default bg-surface-alt p-4 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.consentCheckbox}
                      onChange={(e) => updateDraft({ consentCheckbox: e.target.checked })}
                      className="rounded border-border-default text-primary-500 mt-0.5"
                      aria-invalid={errors.consentCheckbox ? "true" : "false"}
                    />
                    <span className="text-sm">
                      I understand that JobFlow will act on my behalf within these limits. I can change these settings in Settings at any time.
                    </span>
                  </label>
                  {errors.consentCheckbox && (
                    <p className="text-xs text-error-600" role="alert">{errors.consentCheckbox}</p>
                  )}
                </div>
              </div>
            )}

            {step === "review" && (
              <ReviewStep draft={draft} onEdit={goToStep} />
            )}

            <div className="flex flex-wrap justify-between gap-4 pt-4 border-t border-border-default">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={stepIndex === 0}
                aria-label={stepIndex === 0 ? "First step" : "Previous step"}
              >
                <ChevronLeft className="h-4 w-4 mr-1" aria-hidden /> Back
              </Button>
              {step === "review" ? (
                <Button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  aria-label="Finish and go to my dashboard"
                >
                  {isSubmitting ? "Saving…" : "Finish and go to my dashboard"}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext} aria-label="Next step">
                  Save and continue <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside
        className={cn(
          "lg:w-80 shrink-0",
          "rounded-lg border border-border-default bg-surface-alt p-6 h-fit"
        )}
        aria-labelledby="context-title"
      >
        <h2 id="context-title" className="text-sm font-semibold text-text-primary">{ctx.title}</h2>
        <p className="mt-2 text-sm text-text-secondary">{ctx.body}</p>
        {ctx.preview && (
          <p className="mt-3 text-xs text-text-tertiary border-t border-border-default pt-3">
            Your work coach will see: {ctx.preview}
          </p>
        )}
      </aside>
    </div>
  )
}

function SkillsTagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = React.useState("")
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const t = input.trim()
      if (t && !value.includes(t)) onChange([...value, t])
      setInput("")
    }
  }
  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))
  return (
    <div className="rounded-md border border-border-default bg-surface-DEFAULT px-3 py-2 flex flex-wrap gap-2">
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded bg-primary-500/20 text-primary-700 dark:text-primary-300 px-2 py-0.5 text-sm"
        >
          {t}
          <button type="button" onClick={() => remove(t)} className="hover:text-error-600" aria-label={`Remove ${t}`}>×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm py-1"
        aria-label="Add skill"
      />
    </div>
  )
}

function ReviewStep({ draft, onEdit }: { draft: ProfileDraft; onEdit: (s: OnboardingStep) => void }) {
  return (
    <div className="space-y-6">
      <ReviewBlock
        title="About you"
        step="about"
        onEdit={onEdit}
        summary={[draft.firstName, draft.lastName].filter(Boolean).join(" ") || "—"}
        details={[draft.email, draft.phone, draft.postcode].filter(Boolean).join(" · ") || "—"}
      />
      <ReviewBlock
        title="Experience and skills"
        step="experience"
        onEdit={onEdit}
        summary={draft.noticePeriod || "—"}
        details={draft.skillsTags.length ? draft.skillsTags.join(", ") : "—"}
      />
      <ReviewBlock
        title="Job preferences"
        step="preferences"
        onEdit={onEdit}
        summary={draft.desiredJobTypes.length ? `${draft.desiredJobTypes.length} type(s)` : "—"}
        details={[
          draft.remotePreference.replace("_", " "),
          `Up to ${draft.maxCommuteKm} miles`,
          draft.minimumPay ? `Min £${draft.minimumPay}` : null,
        ].filter(Boolean).join(" · ") || "—"}
      />
      <ReviewBlock
        title="Automation"
        step="automation"
        onEdit={onEdit}
        summary={draft.automationMode === "auto_apply" ? "Auto-apply" : "Review first"}
        details={`Daily cap: ${draft.dailyApplicationCap} · ${draft.allowedPlatforms.join(", ")}`}
      />
    </div>
  )
}

function ReviewBlock({
  title,
  step,
  onEdit,
  summary,
  details,
}: {
  title: string
  step: OnboardingStep
  onEdit: (s: OnboardingStep) => void
  summary: string
  details: string
}) {
  return (
    <div className="rounded-lg border border-border-default p-4">
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-medium text-sm text-text-primary">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="text-xs text-primary-500 hover:text-primary-600 underline"
        >
          Edit
        </button>
      </div>
      <p className="text-sm text-text-secondary mt-1">{summary}</p>
      <p className="text-xs text-text-tertiary mt-0.5">{details}</p>
    </div>
  )
}
