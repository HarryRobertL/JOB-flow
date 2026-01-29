/**
 * Sidebar Demo Component
 * 
 * Example implementation of the Sidebar component with JobFlow branding.
 * This demonstrates how to use the sidebar in the application.
 */

import { useState } from "react"
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar"
import { LayoutDashboard, Settings, LogOut, FileText, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

export function SidebarDemo() {
  const links = [
    {
      label: "Dashboard",
      href: "/",
      icon: (
        <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Applications",
      href: "/status",
      icon: (
        <FileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: (
        <BarChart3 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Settings",
      href: "/setup",
      icon: (
        <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Logout",
      href: "/logout",
      icon: (
        <LogOut className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ]

  const [open, setOpen] = useState(false)

  return (
    <div
      className={cn(
        "rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 max-w-7xl mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
        "h-[60vh]" // for your use case, use `h-screen` instead of `h-[60vh]`
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "JobFlow User",
                href: "#",
                icon: (
                  <img
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop"
                    className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                    alt="Avatar"
                  />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <Dashboard />
    </div>
  )
}

export const Logo = () => {
  return (
    <a
      href="/"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <img
        src="/logo-logo.png"
        alt="JobFlow"
        className="h-8 w-auto object-contain"
      />
    </a>
  )
}

export const LogoIcon = () => {
  return (
    <a
      href="/"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <img
        src="/logo-logo.png"
        alt="JobFlow"
        className="h-8 w-8 object-contain"
      />
    </a>
  )
}

// Dummy dashboard component with content
const Dashboard = () => {
  return (
    <div className="flex flex-1">
      <div className="p-2 md:p-10 rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full h-full">
        <div className="flex gap-2">
          {[...new Array(4)].map((_, i) => (
            <div
              key={"first-array" + i}
              className="h-20 w-full rounded-lg bg-gray-100 dark:bg-neutral-800 animate-pulse"
            ></div>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          {[...new Array(2)].map((_, i) => (
            <div
              key={"second-array" + i}
              className="h-full w-full rounded-lg bg-gray-100 dark:bg-neutral-800 animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    </div>
  )
}

