/**
 * 404 Not Found page.
 * Shown when the user navigates to a URL that does not match any route.
 */

import * as React from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Home, LogIn } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export const NotFoundPage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-bgBody flex flex-col items-center justify-center p-6">
      <PageHeader
        title="Page not found"
        description="The page you are looking for does not exist or has been moved."
      />
      <div className="flex flex-wrap gap-3 mt-6">
        {user ? (
          <Link to="/app/dashboard">
            <Button variant="default">
              <Home className="h-4 w-4 mr-2" />
              Go to dashboard
            </Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button variant="default">
              <LogIn className="h-4 w-4 mr-2" />
              Sign in
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
