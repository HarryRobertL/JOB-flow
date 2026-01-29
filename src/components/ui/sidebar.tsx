/**
 * Sidebar Component
 * 
 * Animated sidebar component compatible with shadcn UI patterns.
 * Adapted for Vite/React (not Next.js).
 * 
 * Features:
 * - Desktop sidebar with hover expand/collapse
 * - Mobile sidebar with slide-in animation
 * - Context-based state management
 * - Framer Motion animations
 */

import { cn } from "@/lib/utils"
import React, { useState, createContext, useContext } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, X } from "lucide-react"

interface Links {
  label: string
  href: string
  icon: React.JSX.Element | React.ReactNode
}

interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  const [openState, setOpenState] = useState(false)

  const open = openProp !== undefined ? openProp : openState
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  )
}

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  )
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar()
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-bgLayer2 border-r border-borderSubtle w-[300px] flex-shrink-0",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar()

  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-bgLayer2 border-b border-borderSubtle w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blueAccent focus:ring-offset-2 focus:ring-offset-bgLayer1"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-sidebar"
            data-testid="mobile-menu-toggle"
          >
            <Menu className="text-text-primary h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-background-default p-10 z-[100] flex flex-col justify-between",
                className
              )}
              id="mobile-sidebar"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <button
                type="button"
                className="absolute right-10 top-10 z-50 text-text-primary p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blueAccent focus:ring-offset-2 focus:ring-offset-bgLayer1"
                onClick={() => setOpen(!open)}
                aria-label="Close navigation menu"
                data-testid="mobile-menu-close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links
  className?: string
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const { open, animate } = useSidebar()

  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blueAccent focus:ring-offset-2 focus:ring-offset-bgLayer1",
        className
      )}
      aria-label={link.label}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-text-primary text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </a>
  )
}

