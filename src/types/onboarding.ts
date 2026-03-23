/**
 * Onboarding types
 *
 * Profile draft and step types aligned with PUT /api/claimant/profile
 * and PRODUCT_SPEC "Onboard and Create Profile".
 */

export type OnboardingStep = "about" | "experience" | "preferences" | "automation" | "review"

export type AutomationPlatform = "indeed" | "greenhouse" | "lever" | "workday"

/** Payload shape for PUT /api/claimant/profile (camelCase as sent to backend) */
export interface ProfileUpdatePayload {
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
  discoverOnly?: boolean
  requireReview?: boolean
  cvPath?: string
  coverLetterTemplate?: string
}

/** Shape returned by GET /api/claimant/profile */
export interface ClaimantProfileResponse {
  skippedOnboarding?: boolean
  first_name?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  location?: string
  postcode?: string
  city?: string
  address?: string
  cvPath?: string
  coverLetterTemplate?: string
  discoverOnly?: boolean
  requireReview?: boolean
  requiredApplicationsPerWeek?: number
  dailyCap?: number
  remotePreference?: string
  salaryMin?: number
}

/**
 * Profile draft held in onboarding state.
 * Includes all fields we collect; we map to ProfileUpdatePayload on submit.
 */
export interface ProfileDraft {
  // Step 1: About you
  firstName: string
  lastName: string
  email: string
  phone: string
  postcode: string
  location: string
  preferredContactTime?: string

  // Step 2: Experience and skills
  employmentStatus: string
  yearsExperience: string
  lastRoleTitle?: string
  skillsTags: string[]
  noticePeriod: string
  rightToWorkConfirmed: boolean

  // Step 3: Job preferences
  desiredJobTypes: string[]
  locations: string[]
  maxCommuteKm: number
  remotePreference: "any" | "mostly_in_person" | "mostly_remote"
  minimumPay?: number

  // Step 4: Automation settings
  automationMode: "review_first" | "auto_apply"
  dailyApplicationCap: number
  allowedPlatforms: AutomationPlatform[]
  excludeKeywords: string
  consentCheckbox: boolean

  // Optional paths (if we collect them)
  cvPath?: string
  coverLetterTemplate?: string
}

export const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
  "about",
  "experience",
  "preferences",
  "automation",
  "review",
]

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  about: "About you",
  experience: "Experience and skills",
  preferences: "Job preferences",
  automation: "Automation settings",
  review: "Review",
}
