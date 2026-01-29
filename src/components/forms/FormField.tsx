/**
 * FormField Component
 * 
 * Shared form field pattern for JobFlow.
 * Provides consistent structure with label, description, error message,
 * and required field indicators.
 */

import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface FormFieldProps {
  /** Field label */
  label: string
  /** Field name for form association */
  name?: string
  /** Field ID for label association */
  id?: string
  /** Helper text or description */
  description?: string
  /** Error message to display */
  error?: string
  /** Whether the field is required */
  required?: boolean
  /** Child input/select/textarea element */
  children: React.ReactNode
  /** Additional className for the container */
  className?: string
  /** HTML element to render as the label */
  labelAs?: "label" | "div"
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      name,
      id,
      description,
      error,
      required = false,
      children,
      className,
      labelAs = "label",
    },
    ref
  ) => {
    const fieldId = id || name
    const LabelComponent = labelAs === "label" ? Label : "div"

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        <LabelComponent
          htmlFor={labelAs === "label" ? fieldId : undefined}
          className={cn(
            "text-sm font-medium leading-none",
            error && "text-error-600",
            !error && "text-text-primary"
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-error-500" aria-label="required">
              *
            </span>
          )}
        </LabelComponent>

        {description && (
          <p className="text-xs text-text-secondary" id={fieldId ? `${fieldId}-description` : undefined}>
            {description}
          </p>
        )}

        <div className="relative">
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, {
                id: fieldId,
                name,
                "aria-invalid": error ? "true" : "false",
                "aria-describedby": cn(
                  description && fieldId ? `${fieldId}-description` : undefined,
                  error && fieldId ? `${fieldId}-error` : undefined
                )
                  .split(" ")
                  .filter(Boolean)
                  .join(" ") || undefined,
                className: cn(
                  error && "border-error-500 focus-visible:ring-error-500",
                  (children as React.ReactElement<any>).props?.className
                ),
              })
            : children}
        </div>

        {error && (
          <p
            className="text-xs text-error-600"
            id={fieldId ? `${fieldId}-error` : undefined}
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

