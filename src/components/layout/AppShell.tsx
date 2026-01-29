/**
 * AppShell Component
 * 
 * Main layout component for the logged-in JobFlow experience.
 * Uses the animated Sidebar component for navigation.
 * Provides:
 * - Animated left sidebar navigation (desktop: hover to expand, mobile: slide-in)
 * - Top bar with app title, user name, and status indicator
 * - Content area with consistent padding and max width
 * - Responsive design for mobile, tablet, and desktop
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar"
import { Logo, LogoIcon } from "@/components/ui/sidebar-demo"
import { Home, FileText, Settings } from "lucide-react"

export interface AppShellProps {
  children: React.ReactNode
  /** App title displayed in top bar */
  appTitle?: string
  /** User name (claimant or staff) displayed in top bar */
  userName?: string
  /** Status indicator text */
  statusText?: string
  /** Status indicator variant */
  statusVariant?: "default" | "success" | "warning" | "error"
  /** Current active route for highlighting */
  activeRoute?: string
  /** User avatar URL (optional) */
  userAvatar?: string
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  appTitle = "JobFlow",
  userName,
  statusText,
  statusVariant = "default",
  activeRoute = "/",
  userAvatar,
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const statusColors = {
    default: "bg-neutral-100 text-neutral-700",
    success: "bg-success-100 text-success-700",
    warning: "bg-warning-100 text-warning-700",
    error: "bg-error-100 text-error-700",
  }

  // Navigation links for JobFlow
  const navLinks = [
    {
      label: "Home",
      href: "/",
      icon: <Home className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Applications",
      href: "/status",
      icon: <FileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Setup",
      href: "/setup",
      icon: <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
  ]

  // Default avatar if none provided
  const defaultAvatar = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop"

  return (
    <div className="flex h-screen overflow-hidden bg-bgBody">
      {/* Animated Sidebar */}
      <nav aria-label="Main navigation">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              {/* Logo - shows full when open, icon when closed */}
              <div aria-label={appTitle}>
                {sidebarOpen ? <Logo /> : <LogoIcon />}
              </div>

              {/* Navigation Links */}
              <ul className="mt-8 flex flex-col gap-2" role="list">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <SidebarLink
                      link={link}
                      className={cn(
                        activeRoute === link.href &&
                          "bg-primary-50 text-primary-700 dark:bg-primary-900/20"
                      )}
                      aria-current={activeRoute === link.href ? "page" : undefined}
                      data-testid={`nav-link-${link.href.replace(/\//g, '') || 'home'}`}
                    />
                  </li>
                ))}
              </ul>
            </div>

            {/* User Profile at Bottom */}
            {userName && (
              <div>
                <SidebarLink
                  link={{
                    label: userName,
                    href: "#",
                    icon: (
                      <img
                        src={userAvatar || defaultAvatar}
                        className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                        alt={`${userName} profile`}
                      />
                    ),
                  }}
                  aria-label={`User profile: ${userName}`}
                  data-testid="user-profile-link"
                />
              </div>
            )}
          </SidebarBody>
        </Sidebar>
      </nav>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header 
          className="sticky top-0 z-sticky flex h-16 items-center justify-between border-b border-borderSubtle bg-bgLayer2 px-4 lg:px-6 shadow-sm"
          role="banner"
        >
          <div className="flex items-center gap-4">
            {/* User name */}
            {userName && (
              <div className="hidden text-sm text-text-secondary sm:block">
                <span className="font-medium" aria-label={`Logged in as ${userName}`}>{userName}</span>
              </div>
            )}
            {/* App title on mobile */}
            <h1 className="text-sm font-semibold text-neutral-900 sm:hidden">
              {appTitle}
            </h1>
          </div>

          {/* Status indicator */}
          {statusText && (
            <div
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                statusColors[statusVariant]
              )}
              role="status"
              aria-live="polite"
              aria-label={`Status: ${statusText}`}
              data-testid="status-indicator"
            >
              {statusText}
            </div>
          )}
        </header>

        {/* Content area */}
        <main 
          className="flex-1 overflow-y-auto bg-bgLayer1"
          id="main-content"
          role="main"
          aria-label="Main content"
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Footer with help links */}
        <footer 
          className="border-t border-borderSubtle bg-bgLayer2 px-4 py-4 lg:px-6"
          role="contentinfo"
          aria-label="Site footer"
        >
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-start">
              <a
                href="/help"
                className="text-blueAccent hover:text-blueAccent/90 underline focus:outline-none focus:ring-2 focus:ring-blueAccent focus:ring-offset-2 focus:ring-offset-bgLayer1 rounded"
                data-testid="footer-help-link"
              >
                Need help?
              </a>
              <span className="text-neutral-400" aria-hidden="true">|</span>
              <a
                href="/privacy"
                className="text-neutral-600 hover:text-neutral-700 underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                data-testid="footer-privacy-link"
              >
                Privacy policy
              </a>
              <span className="text-neutral-400" aria-hidden="true">|</span>
              <a
                href="/data-use"
                className="text-neutral-600 hover:text-neutral-700 underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                data-testid="footer-data-use-link"
              >
                How we use your data
              </a>
            </div>
            <p className="text-neutral-500 text-xs">
              JobFlow - Department for Work and Pensions
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
