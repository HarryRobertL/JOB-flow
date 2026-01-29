/**
 * Sidebar Example Page
 * 
 * Example page demonstrating the Sidebar component integration.
 * This can be used as a reference for implementing the sidebar in other pages.
 */

import { SidebarDemo } from "@/components/ui/sidebar-demo"

export const SidebarExample = () => {
  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-text-primary">
          Sidebar Component Example
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          This demonstrates the animated sidebar component with JobFlow branding.
          Hover over the desktop sidebar to see it expand, or click the menu icon on mobile.
        </p>
        <SidebarDemo />
      </div>
    </div>
  )
}

