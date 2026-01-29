/**
 * 500 Server Error page.
 * Shown when an uncaught error occurs (e.g. via error boundary).
 */

import * as React from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Home, RefreshCw } from "lucide-react"

export const ServerErrorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-bgBody flex flex-col items-center justify-center p-6">
      <PageHeader
        title="Something went wrong"
        description="An unexpected error occurred. Please try again or return to the home page."
      />
      <div className="flex flex-wrap gap-3 mt-6">
        <Button variant="default" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh page
        </Button>
        <Link to="/">
          <Button variant="outline">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
