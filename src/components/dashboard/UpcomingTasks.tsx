/**
 * UpcomingTasks Component
 * 
 * Central panel showing upcoming suggested roles or application tasks
 * with obvious primary action buttons for each.
 */

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface JobApplication {
  id: string
  title: string
  company: string
  location?: string
  status: "pending_review" | "ready_to_submit" | "draft" | "auto_queued"
  requiresReview: boolean
  url?: string
  queuedAt?: string
}

export interface UpcomingTasksProps {
  /** List of upcoming job applications or tasks */
  tasks?: JobApplication[]
  /** Callback when user clicks to review an application */
  onReview?: (taskId: string) => void
  /** Callback when user clicks to submit an application */
  onSubmit?: (taskId: string) => void
  /** Callback when user clicks to view an application */
  onView?: (taskId: string) => void
}

export const UpcomingTasks: React.FC<UpcomingTasksProps> = ({
  tasks = [],
  onReview,
  onSubmit,
  onView,
}) => {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suggested applications</CardTitle>
          <CardDescription>
            JobFlow will suggest new job applications here as they become available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary">
              No new applications suggested at the moment. Check back soon or start a new search.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (task: JobApplication) => {
    if (task.status === "auto_queued") {
      return <Badge variant="info">Auto-queued</Badge>
    }
    if (task.status === "pending_review") {
      return <Badge variant="warning">Needs review</Badge>
    }
    if (task.status === "ready_to_submit") {
      return <Badge variant="success">Ready to submit</Badge>
    }
    return <Badge variant="outline">Draft</Badge>
  }

  const getPrimaryAction = (task: JobApplication) => {
    if (task.requiresReview || task.status === "pending_review") {
      return (
        <Button
          onClick={() => onReview?.(task.id)}
          className="w-full sm:w-auto"
          aria-label={`Review application for ${task.title} at ${task.company}`}
          data-testid={`review-task-${task.id}`}
        >
          Review and submit
        </Button>
      )
    }
    if (task.status === "ready_to_submit") {
      return (
        <Button
          onClick={() => onSubmit?.(task.id)}
          className="w-full sm:w-auto"
          aria-label={`Submit application for ${task.title} at ${task.company}`}
          data-testid={`submit-task-${task.id}`}
        >
          Submit application
        </Button>
      )
    }
    return (
      <Button
        variant="outline"
        onClick={() => onView?.(task.id)}
        className="w-full sm:w-auto"
        aria-label={`View application for ${task.title} at ${task.company}`}
        data-testid={`view-task-${task.id}`}
      >
        View details
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested applications</CardTitle>
        <CardDescription>
          {tasks.filter(t => t.requiresReview || t.status === "pending_review").length > 0 && (
            <span className="text-warning-700 font-medium">
              {tasks.filter(t => t.requiresReview || t.status === "pending_review").length} application{tasks.filter(t => t.requiresReview || t.status === "pending_review").length !== 1 ? 's' : ''} need your review
            </span>
          )}
          {tasks.filter(t => t.requiresReview || t.status === "pending_review").length === 0 && (
            "Applications that JobFlow has found for you"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" role="list" aria-label="Suggested job applications">
          {tasks.map((task) => (
            <div
              key={task.id}
              role="listitem"
              className={cn(
                "rounded-lg border p-4 transition-colors",
                "focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2",
                task.requiresReview || task.status === "pending_review"
                  ? "border-warning-200 bg-warning-50"
                  : "border-neutral-200 bg-white"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary">{task.title}</h3>
                      <p className="text-sm text-text-secondary">{task.company}</p>
                      {task.location && (
                        <p className="text-xs text-text-tertiary mt-1">{task.location}</p>
                      )}
                    </div>
                    {getStatusBadge(task)}
                  </div>

                  {task.status === "auto_queued" && task.queuedAt && (
                    <div className="rounded-md bg-info-50 border border-info-200 p-2">
                      <p className="text-xs text-info-800">
                        <strong>Auto-queued:</strong> JobFlow found this role and prepared an application. 
                        {task.requiresReview ? " Please review before submitting." : " Ready to submit."}
                      </p>
                    </div>
                  )}

                  {task.requiresReview && (
                    <div className="rounded-md bg-warning-50 border border-warning-200 p-2">
                      <p className="text-xs text-warning-800">
                        <strong>Action required:</strong> This application needs your review before it can be submitted. 
                        <span className="font-medium"> Counts toward your Universal Credit job search log</span> once submitted.
                      </p>
                    </div>
                  )}

                  {!task.requiresReview && task.status === "ready_to_submit" && (
                    <p className="text-xs text-text-secondary">
                      Ready to submit. <span className="font-medium">This will count toward your job search requirement.</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  {getPrimaryAction(task)}
                  {task.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(task.url, '_blank', 'noopener,noreferrer')}
                      className="w-full sm:w-auto"
                      aria-label={`Open job posting for ${task.title} at ${task.company} in new tab`}
                    >
                      View job
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

