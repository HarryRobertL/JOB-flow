/**
 * 403 Forbidden page.
 * Shown when the user does not have permission to access a resource.
 */

import * as React from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Home, ShieldAlert } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export const ForbiddenPage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-bgBody flex flex-col items-center justify-center p-6">
      <ShieldAlert className="h-12 w-12 text-amber-500 mb-4" aria-hidden />
      <PageHeader
        title="Access denied"
        description="You do not have permission to view this page. If you believe this is an error, contact your administrator."
      />
      <div className="flex flex-wrap gap-3 mt-6">
        {user?.role === "claimant" && (
          <Link to="/app/dashboard">
            <Button variant="default">
              <Home className="h-4 w-4 mr-2" />
              Claimant dashboard
            </Button>
          </Link>
        )}
        {user?.role === "coach" && (
          <Link to="/staff/work-coach">
            <Button variant="default">
              <Home className="h-4 w-4 mr-2" />
              Work coach dashboard
            </Button>
          </Link>
        )}
        {user?.role === "admin" && (
          <Link to="/staff/dwp">
            <Button variant="default">
              <Home className="h-4 w-4 mr-2" />
              Admin dashboard
            </Button>
          </Link>
        )}
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
