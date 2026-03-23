/**
 * Login Page
 *
 * Shared login page for all roles (claimant, coach, admin).
 * After successful login, redirects: new claimant → /app/onboarding,
 * returning claimant → /app/dashboard, staff → their staff landing.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useAnalytics } from "@/lib/useAnalytics"
import type { LoginRedirectEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import type { User } from "@/contexts/AuthContext"

export function getRedirectPathForUser(u: User): string {
  switch (u.role) {
    case "claimant":
      return u.hasCompletedOnboarding ? "/app/dashboard" : "/app/onboarding"
    case "coach":
      return "/staff/work-coach"
    case "admin":
      return "/staff/dwp"
    default:
      return "/login"
  }
}

export function LoginPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const { track } = useAnalytics()

  const redirectForUser = React.useCallback(
    (u: User) => {
      const targetPath = getRedirectPathForUser(u)
      const ev: Omit<LoginRedirectEvent, "timestamp" | "sessionId"> = {
        event: "login_redirect",
        role: u.role,
        targetPath,
      }
      if (u.role === "claimant") {
        (ev as LoginRedirectEvent).hasCompletedOnboarding = u.hasCompletedOnboarding
      }
      track(ev as LoginRedirectEvent).catch(() => {})
      navigate(targetPath, { replace: true })
    },
    [navigate, track]
  )

  React.useEffect(() => {
    if (user) redirectForUser(user)
  }, [user, redirectForUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(email, password)
      // Login successful - useAuth will update user state, which triggers redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bgBody p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/logo-logo.png"
                alt="JobFlow"
                className="h-10 w-10 object-contain"
              />
            </div>
            <CardDescription className="text-base">
              Sign in to your account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-md bg-error-50 text-error-700 text-sm"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            <p>Demo credentials:</p>
            <p className="font-mono text-xs mt-1">
              claimant@example.com / password
              <br />
              coach@example.com / password
              <br />
              admin@example.com / password
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

