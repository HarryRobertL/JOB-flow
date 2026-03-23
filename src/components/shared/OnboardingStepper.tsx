/**
 * OnboardingStepper
 *
 * Accessible stepper for the onboarding wizard.
 * Steps: About you, Experience and skills, Job preferences, Automation settings, Review.
 * Visual state: current, completed, upcoming.
 */

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OnboardingStep } from "@/types/onboarding"
import { ONBOARDING_STEP_ORDER, ONBOARDING_STEP_LABELS } from "@/types/onboarding"
import { Progress } from "@/components/ui/progress"

export interface OnboardingStepperProps {
  currentStep: OnboardingStep
  className?: string
}

const stepIndex = (s: OnboardingStep): number => ONBOARDING_STEP_ORDER.indexOf(s)

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({ currentStep, className }) => {
  const currentIdx = stepIndex(currentStep)
  const total = ONBOARDING_STEP_ORDER.length
  const progress = ((currentIdx + 1) / total) * 100

  return (
    <nav
      aria-label="Onboarding progress"
      className={cn("w-full", className)}
    >
      <Progress
        value={progress}
        className="mb-4"
        aria-label={`Onboarding progress ${Math.round(progress)} percent`}
      />
      <ol
        className="flex flex-wrap items-center gap-2"
        role="list"
        aria-label="Steps"
      >
        {ONBOARDING_STEP_ORDER.map((step, idx) => {
          const isCompleted = idx < currentIdx
          const isCurrent = idx === currentIdx
          const label = ONBOARDING_STEP_LABELS[step]
          return (
            <li
              key={step}
              className="flex items-center gap-2 shrink-0"
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isCompleted && "border-primary-500 bg-primary-500 text-white",
                  isCurrent && "border-primary-500 bg-primary-500/20 text-primary-500",
                  !isCompleted && !isCurrent && "border-border-default bg-surface-alt text-text-tertiary"
                )}
                aria-hidden="true"
              >
                {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  isCurrent && "text-text-primary",
                  isCompleted && "text-text-secondary",
                  !isCompleted && !isCurrent && "text-text-tertiary"
                )}
              >
                {label}
              </span>
              <span className="sr-only">
                {isCurrent ? "Current step" : isCompleted ? "Completed step" : "Upcoming step"}
              </span>
              {idx < total - 1 && (
                <span
                  className="hidden sm:inline h-px w-4 bg-border-default mx-1"
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-2 text-xs text-text-tertiary" aria-live="polite">
        Step {currentIdx + 1} of {total}
      </p>
    </nav>
  )
}
