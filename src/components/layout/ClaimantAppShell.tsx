/**
 * ClaimantAppShell Component
 * 
 * Layout shell specifically for claimant users.
 * Includes navigation for claimant-specific routes and logout functionality.
 */

import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar"
import { Logo, LogoIcon } from "@/components/ui/sidebar-demo"
import { AppHeader } from "./AppHeader"
import { Home, FileText, Settings, Search, Shield, HelpCircle } from "lucide-react"

export interface ClaimantAppShellProps {
  children: React.ReactNode
}

export const ClaimantAppShell: React.FC<ClaimantAppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  const navLinks = [
    {
      label: "Dashboard",
      href: "/app/dashboard",
      icon: <Home className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Jobs",
      href: "/app/jobs",
      icon: <Search className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Applications",
      href: "/app/applications",
      icon: <FileText className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Compliance Log",
      href: "/app/compliance",
      icon: <Shield className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Support",
      href: "/app/support",
      icon: <HelpCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
    {
      label: "Settings",
      href: "/app/settings",
      icon: <Settings className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <div className="flex h-screen overflow-hidden bg-bgBody">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-modal focus:px-4 focus:py-2 focus:bg-jobflow focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blueAccent focus:ring-offset-2 focus:ring-offset-bgLayer1"
      >
        Skip to main content
      </a>

      <nav aria-label="Main navigation" role="navigation">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              <div aria-label="JobFlow">{sidebarOpen ? <Logo /> : <LogoIcon />}</div>

              <ul className="mt-8 flex flex-col gap-2" role="list">
                {navLinks.map((link) => {
                  const active = isActive(link.href)
                  return (
                    <li key={link.href}>
                      <SidebarLink
                        link={link}
                        className={cn(
                          "relative transition-colors",
                          active && "bg-surface-alt text-text-primary font-medium",
                          active && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-jobflow before:rounded-r"
                        )}
                        aria-current={active ? "page" : undefined}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          </SidebarBody>
        </Sidebar>
      </nav>

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          userName={user?.display_name || undefined}
          userEmail={user?.email || undefined}
          role={user?.role || "claimant"}
          onLogout={handleLogout}
        />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-bgLayer1"
          role="main"
          aria-label="Main content"
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

