/**
 * Button Component
 * 
 * shadcn UI compatible button component for JobFlow.
 * Provides accessible, styled buttons with variants for different use cases.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bgLayer1",
          "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
          "min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px]", // WCAG AA touch target size
          {
            // Variants – primary uses JobFlow orange; focus uses blue accent
            "bg-jobflow text-white hover:bg-primary-600 active:bg-primary-700": variant === "default",
            "bg-error-500 text-white hover:bg-error-600 active:bg-error-700": variant === "destructive",
            "border border-borderSubtle bg-transparent hover:bg-bgLayer2 hover:border-border-hover text-text-primary": variant === "outline",
            "bg-bgLayer2 text-text-primary hover:bg-surface-elevated active:bg-surface-elevated border border-borderSubtle": variant === "secondary",
            "hover:bg-bgLayer2 hover:text-text-primary active:bg-surface-elevated": variant === "ghost",
            "text-blueAccent underline-offset-4 hover:underline hover:text-blueAccent/90": variant === "link",
            // Sizes
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3 text-sm": size === "sm",
            "h-11 px-8 text-base": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

