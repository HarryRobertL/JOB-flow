/**
 * ComplianceSummary Component
 * 
 * Top section of the claimant dashboard that answers:
 * - What is my current job search requirement for this period
 * - What have I already done and is it enough
 * - Any overdue items or upcoming Jobcentre appointments
 */

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { KPICard } from "@/components/shared/KPICard"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ComplianceSummaryProps {
  /** Required applications for current period (e.g., weekly requirement) */
  requiredApplications?: number
  /** Completed applications this period */
  completedApplications?: number
  /** Overdue items count */
  overdueCount?: number
  /** Upcoming Jobcentre appointment date */
  nextAppointment?: string | null
  /** Period label (e.g., "This week", "This month") */
  periodLabel?: string
  /** Weekly stats split by status */
  weeklyStats?: {
    applied?: number
    skipped?: number
    error?: number
  }
}

export const ComplianceSummary: React.FC<ComplianceSummaryProps> = ({
  requiredApplications = 0,
  completedApplications = 0,
  overdueCount = 0,
  nextAppointment = null,
  periodLabel = "This week",
  weeklyStats,
}) => {
  const isComplete = completedApplications >= requiredApplications
  const remaining = Math.max(requiredApplications - completedApplications, 0)
  const appliedCount = weeklyStats?.applied ?? completedApplications
  const skippedCount = weeklyStats?.skipped ?? 0
  const errorCount = weeklyStats?.error ?? 0

  return (
    <div className="space-y-6">
      {/* Main Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your job search requirement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Weekly Target */}
          <div className="rounded-md bg-info-50 border border-info-200 p-3" role="status" aria-live="polite">
            <p className="text-sm text-info-800">
              <strong>
                {requiredApplications > 0
                  ? `Your coach asked for ${requiredApplications} application${requiredApplications !== 1 ? "s" : ""} per week.`
                  : "Your weekly job search requirement"}
              </strong>
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-2" role="region" aria-label="Job search requirement progress">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {periodLabel} requirement: <strong className="text-text-primary">{requiredApplications} applications</strong>
              </span>
              <span 
                className={cn(
                  "font-medium",
                  isComplete ? "text-success-600" : "text-text-secondary"
                )}
                aria-live="polite"
                aria-atomic="true"
              >
                {completedApplications} of {requiredApplications} completed
              </span>
            </div>
            <Progress
              value={completedApplications}
              max={requiredApplications || 1}
              variant={isComplete ? "success" : "default"}
              className="h-3"
              aria-label={`Progress: ${completedApplications} out of ${requiredApplications} applications completed`}
            />
            {!isComplete && (
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">{remaining} more application{remaining !== 1 ? 's' : ''}</span> needed to meet your requirement
              </p>
            )}
            {isComplete && (
              <p className="text-sm text-success-700 font-medium">
                ✓ You have met your requirement for {periodLabel.toLowerCase()}
              </p>
            )}
          </div>

          {/* Weekly Stats by Status */}
          {weeklyStats && (
            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              <KPICard
                title="Applied"
                value={appliedCount}
                description={periodLabel.toLowerCase()}
                variant="success"
                icon={<CheckCircle className="h-4 w-4" />}
              />
              {skippedCount > 0 && (
                <KPICard
                  title="Skipped"
                  value={skippedCount}
                  description={periodLabel.toLowerCase()}
                  variant="warning"
                  icon={<AlertCircle className="h-4 w-4" />}
                />
              )}
              {errorCount > 0 && (
                <KPICard
                  title="Errors"
                  value={errorCount}
                  description={periodLabel.toLowerCase()}
                  variant="error"
                  icon={<XCircle className="h-4 w-4" />}
                />
              )}
            </div>
          )}

          {/* Compliance Notice */}
          <div className="rounded-md bg-info-50 border border-info-200 p-3" role="status" aria-live="polite">
            <p className="text-sm text-info-800">
              <strong>Counts toward your Universal Credit job search log.</strong> All applications submitted through JobFlow are automatically logged for your work coach.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Appointments */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Overdue Items */}
        {overdueCount > 0 && (
          <Card className="border-warning-200 bg-warning-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-warning-700">Action needed</span>
                <Badge variant="warning">{overdueCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-warning-800">
                You have {overdueCount} application{overdueCount !== 1 ? 's' : ''} waiting for your review before they can be submitted.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Next Appointment */}
        {nextAppointment && (
          <Card className="border-info-200 bg-info-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-info-700">Next Jobcentre appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-info-800">{nextAppointment}</p>
              <p className="text-xs text-info-700 mt-1">
                Your job search log will be reviewed at this appointment
              </p>
            </CardContent>
          </Card>
        )}

        {/* No Alerts State */}
        {overdueCount === 0 && !nextAppointment && (
          <Card className="border-success-200 bg-success-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-success-700">All up to date</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-success-800">
                No overdue items or upcoming appointments. Keep up the good work!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

