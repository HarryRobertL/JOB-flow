/**
 * Landing Page
 *
 * Public first-run experience for JobFlow.
 * Claimant-first story into onboarding and login, with distinct staff entry points.
 */

import { useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/shared/KPICard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { useAnalytics } from "@/lib/useAnalytics"
import type { LandingViewedEvent, LandingCtaClickedEvent } from "@/lib/analytics"
import {
  User,
  Settings,
  Zap,
  Shield,
  FileCheck,
  Users,
  Lock,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** Fire-and-forget analytics so navigation is never blocked */
function useLandingCta(
  track: (e: Omit<LandingCtaClickedEvent, "timestamp" | "sessionId">) => Promise<void>
) {
  const navigate = useNavigate()
  return useCallback(
    (path: string, role: LandingCtaClickedEvent["role"], cta: string) => {
      track({ event: "landing_cta_clicked", role, cta }).catch(() => {})
      navigate(path)
    },
    [track, navigate]
  )
}

export function LandingPage() {
  const { track } = useAnalytics()
  const handleCta = useLandingCta(track)

  useEffect(() => {
    const ev: Omit<LandingViewedEvent, "timestamp" | "sessionId"> = { event: "landing_viewed" }
    track(ev).catch(() => {})
  }, [track])

  return (
    <div className="min-h-screen bg-bgBody" role="document">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[1100] focus:px-4 focus:py-2 focus:bg-jobflow focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blueAccent focus:ring-offset-2 focus:ring-offset-bgLayer1"
      >
        Skip to main content
      </a>

      <header
        className="border-b border-borderSubtle bg-bgLayer2 shadow-sm"
        role="banner"
        aria-label="Site header"
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center" aria-label="JobFlow home">
              <img
                src="/logo-logo.png"
                alt="JobFlow"
                className="h-[65px] w-[92px] object-contain"
              />
            </div>
            <Link
              to="/login"
              onClick={() => {
                const ev: Omit<LandingCtaClickedEvent, "timestamp" | "sessionId"> = {
                  event: "landing_cta_clicked",
                  role: "unknown",
                  cta: "header_sign_in",
                }
                track(ev).catch(() => {})
              }}
              className="focus:outline-none focus:ring-2 focus:ring-blueAccent focus:ring-offset-2 focus:ring-offset-bgLayer1 rounded-md"
              aria-label="Sign in to your account"
            >
              <Button variant="outline">Sign in</Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16" role="main">
        {/* Hero: claimant-first, two columns */}
        <section
          className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center"
          aria-labelledby="hero-heading"
        >
          <div>
            <h1
              id="hero-heading"
              className="text-3xl font-bold leading-tight tracking-tight text-text-primary sm:text-4xl lg:text-5xl"
            >
              Stay on top of job search without losing your week.
            </h1>
            <p className="mt-6 text-lg text-text-secondary max-w-xl">
              JobFlow works with your work coach to find roles, help you apply, and keep your
              evidence tidy. One place to see how you&apos;re doing and what to do next.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => handleCta("/login", "claimant", "get_started_claimant")}
                className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background-default"
                aria-label="Get started as a claimant"
              >
                Get started as a claimant
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleCta("/login", "unknown", "already_using")}
                className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background-default"
                aria-label="Already using JobFlow — sign in"
              >
                Already using JobFlow
              </Button>
            </div>
          </div>
          <div
            className="relative rounded-xl border border-border-default bg-surface-DEFAULT p-6 shadow-lg overflow-hidden"
            aria-hidden="true"
          >
            <div className={cn("pointer-events-none select-none")}>
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">
                Your dashboard preview
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border border-border-default bg-surface-alt px-4 py-3">
                  <p className="text-xs text-text-tertiary">This week</p>
                  <p className="text-xl font-bold text-text-primary">8 / 10</p>
                  <p className="text-xs text-text-tertiary">applications</p>
                </div>
                <div className="rounded-lg border border-border-default bg-surface-alt px-4 py-3">
                  <p className="text-xs text-text-tertiary">Status</p>
                  <span className="inline-block mt-1">
                    <StatusBadge status="on_track" />
                  </span>
                </div>
              </div>
              <div className="h-16 rounded-lg border border-border-default bg-surface-alt flex items-center justify-center">
                <span className="text-sm text-text-tertiary">Activity timeline</span>
              </div>
            </div>
          </div>
        </section>

        {/* Staff entry strip */}
        <section
          className="mt-16 lg:mt-24 rounded-xl border border-border-default bg-surface-alt px-6 py-6 sm:px-8"
          aria-labelledby="staff-heading"
        >
          <h2 id="staff-heading" className="text-lg font-semibold text-text-primary mb-2">
            For DWP staff
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-2xl">
            Work coaches and regional teams can sign in to see dashboards and evidence.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              onClick={() => handleCta("/login", "coach", "work_coach_sign_in")}
              aria-label="Work coach sign in"
            >
              Work coach sign in
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCta("/login", "admin", "dwp_dashboard")}
              aria-label="DWP dashboard sign in"
            >
              DWP dashboard
            </Button>
          </div>
        </section>

        {/* How it works — three steps */}
        <section
          className="mt-20 lg:mt-28"
          aria-labelledby="how-heading"
        >
          <h2 id="how-heading" className="text-2xl font-semibold leading-tight text-text-primary mb-2">
            How it works
          </h2>
          <p className="text-text-secondary mb-10 max-w-2xl">
            Three simple steps to get you from sign-up to compliant job search.
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            <Card className="border-border-default bg-surface-DEFAULT">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20 text-primary-500 mb-2" aria-hidden="true">
                  <User className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Tell us about you</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Add your profile and job preferences so we can match you to the right roles.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border-default bg-surface-DEFAULT">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20 text-primary-500 mb-2" aria-hidden="true">
                  <Settings className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Set your job search rules</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Choose skills, job types, pay, and how many applications per day. You stay in control.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border-default bg-surface-DEFAULT">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20 text-primary-500 mb-2" aria-hidden="true">
                  <Zap className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Let JobFlow apply and keep your log tidy</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We find roles, apply where you allow, and keep a clear evidence log for your work coach.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Trust and safety */}
        <section
          className="mt-20 lg:mt-28"
          aria-labelledby="trust-heading"
        >
          <h2 id="trust-heading" className="text-2xl font-semibold leading-tight text-text-primary mb-2">
            Built with DWP pilots in mind
          </h2>
          <div className="mt-8 rounded-xl border border-border-default bg-surface-DEFAULT p-6 sm:p-8">
            <ul className="space-y-4" role="list">
              <li className="flex gap-3">
                <Shield className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-text-secondary">
                  You stay in control of when automation runs and how many applications are sent.
                </span>
              </li>
              <li className="flex gap-3">
                <FileCheck className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-text-secondary">
                  You can see your weekly activity log at any time and export it for appointments.
                </span>
              </li>
              <li className="flex gap-3">
                <Lock className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-text-secondary">
                  Sessions use secure browser profiles; your credentials are not stored in config files.
                </span>
              </li>
            </ul>
            <div className="mt-6">
              <StatusBadge status="on_track" className="text-xs" />
              <span className="ml-2 text-sm text-text-tertiary">Pilot status</span>
            </div>
          </div>
        </section>

        {/* What your work coach sees */}
        <section
          className="mt-20 lg:mt-28"
          aria-labelledby="coach-heading"
        >
          <h2 id="coach-heading" className="text-2xl font-semibold leading-tight text-text-primary mb-2">
            Your work coach sees a clean weekly picture
          </h2>
          <p className="text-text-secondary mb-8 max-w-2xl">
            They see counts, flags, and timelines — not your passwords or login details. Everything
            they need to support you and record compliance.
          </p>
          <Card className="border-border-default bg-surface-DEFAULT overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary-500" aria-hidden="true" />
                Example work coach view
              </CardTitle>
              <CardDescription>
                Placeholder counts — real dashboards show live data per claimant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard title="Active" value={12} description="Claimants this week" />
                <KPICard title="On track" value={9} variant="success" description="Meeting target" />
                <KPICard title="At risk" value={2} variant="warning" description="Below target" />
                <KPICard title="Non compliant" value={1} variant="error" description="Needs support" />
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-text-tertiary">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span>Weekly counts and evidence only</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Bottom CTA */}
        <section
          className="mt-20 lg:mt-28 rounded-xl bg-primary-500/10 border border-primary-500/30 p-8 sm:p-12 text-center"
          aria-labelledby="cta-heading"
        >
          <h2 id="cta-heading" className="text-2xl font-semibold leading-tight text-text-primary sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-2 text-base text-text-secondary max-w-xl mx-auto">
            Get started with JobFlow to automate your job applications and keep a clear log for your work coach.
          </p>
          <div className="mt-6">
            <Button
              size="lg"
              onClick={() => handleCta("/login", "claimant", "bottom_get_started")}
              aria-label="Get started as a claimant"
            >
              Get started as a claimant
            </Button>
          </div>
        </section>
      </main>

      <footer
        className="mt-20 border-t border-border-default bg-surface-DEFAULT py-8"
        role="contentinfo"
        aria-label="Site footer"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-text-secondary">
            JobFlow — Department for Work and Pensions
          </p>
        </div>
      </footer>
    </div>
  )
}
