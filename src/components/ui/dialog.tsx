/**
 * Dialog Component
 * 
 * shadcn UI compatible dialog component for JobFlow.
 * Provides accessible modal dialogs with proper focus management.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
}

const DialogContext = React.createContext<{
  open: boolean
  onOpenChange?: (open: boolean) => void
}>({
  open: false,
})

const Dialog = ({ open = false, onOpenChange, children }: DialogProps) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext)
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onOpenChange?.(true)}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
})
DialogTrigger.displayName = "DialogTrigger"

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, ...props }, _ref) => {
    const { open, onOpenChange } = React.useContext(DialogContext)
    const dialogRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      if (open && dialogRef.current) {
        dialogRef.current.focus()
      }
    }, [open])

    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape" && open) {
          onOpenChange?.(false)
          onClose?.()
        }
      }
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }, [open, onOpenChange, onClose])

    if (!open) return null

    return (
      <>
        <div
          className="fixed inset-0 z-modalBackdrop bg-neutral-950/50"
          onClick={() => {
            onOpenChange?.(false)
            onClose?.()
          }}
        />
        <div
          ref={dialogRef}
          className={cn(
            "fixed left-[50%] top-[50%] z-modal translate-x-[-50%] translate-y-[-50%]",
            "w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-lg",
            "focus:outline-none",
            className
          )}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          {...props}
        >
          {children}
        </div>
      </>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neutral-500", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}

