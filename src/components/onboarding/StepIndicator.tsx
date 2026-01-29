/**
 * StepIndicator Component
 * 
 * Visual indicator for multi-step processes.
 * Shows current step, completed steps, and total steps.
 */

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StepIndicatorProps {
  /** Current step (1-indexed) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Step labels */
  stepLabels?: string[]
  /** Additional className */
  className?: string
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
  className,
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep
          const label = stepLabels?.[index]

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted && "bg-primary-500 border-primary-500 text-white",
                    isCurrent && "bg-primary-100 border-primary-500 text-primary-700",
                    !isCompleted && !isCurrent && "bg-white border-neutral-300 text-neutral-500"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <span className="text-sm font-semibold">{step}</span>
                  )}
                </div>
                {label && (
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium text-center max-w-[100px]",
                      isCurrent && "text-primary-700",
                      isCompleted && "text-primary-600",
                      !isCompleted && !isCurrent && "text-neutral-500"
                    )}
                  >
                    {label}
                  </span>
                )}
              </div>
              {step < totalSteps && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors",
                    isCompleted ? "bg-primary-500" : "bg-neutral-300"
                  )}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-text-secondary">
          Step {currentStep} of {totalSteps}
        </p>
      </div>
    </div>
  )
}

