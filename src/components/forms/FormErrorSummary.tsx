/**
 * FormErrorSummary Component
 * 
 * Accessible error summary for forms.
 * Displays a list of form errors with links to the problematic fields.
 */

import * as React from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FormError {
  /** Field name or key */
  field: string
  /** Error message */
  message: string
  /** Optional field ID for linking */
  id?: string
}

export interface FormErrorSummaryProps {
  /** Array of form errors */
  errors: FormError[]
  /** Optional title for the error summary */
  title?: string
  /** Additional className */
  className?: string
  /** Callback when user clicks an error link */
  onErrorClick?: (field: string, id?: string) => void
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  title = "Please fix the following errors:",
  className,
  onErrorClick,
}) => {
  if (errors.length === 0) {
    return null
  }

  const handleErrorClick = (e: React.MouseEvent<HTMLAnchorElement>, field: string, id?: string) => {
    e.preventDefault()
    
    if (id) {
      const element = document.getElementById(id)
      if (element) {
        element.focus()
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
    
    onErrorClick?.(field, id)
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-error-200 bg-error-50 p-4",
        className
      )}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-error-900 mb-2">
            {title}
          </h3>
          <ul className="space-y-1 list-none">
            {errors.map((error, index) => (
              <li key={index}>
                <a
                  href={error.id ? `#${error.id}` : "#"}
                  onClick={(e) => handleErrorClick(e, error.field, error.id)}
                  className="text-sm text-error-700 hover:text-error-900 underline focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 rounded"
                >
                  {error.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

