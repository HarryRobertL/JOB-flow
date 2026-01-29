/**
 * Status Page
 * 
 * Representative page demonstrating the use of the new design system components.
 * This page shows application statistics and serves as a reference pattern for
 * migrating other pages to use the new components.
 * 
 * Note: This is a React component example. In a full migration, this would
 * replace the Jinja2 template at ui/templates/status.html
 */

import * as React from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader, ErrorState, KPICard, EmptyState } from "@/components/shared"

export interface StatusPageProps {
  stats?: {
    total: number
    applied: number
    skip: number
    error: number
    last_run?: string
    error_message?: string
  }
}

export const StatusPage: React.FC<StatusPageProps> = ({
  stats = {
    total: 0,
    applied: 0,
    skip: 0,
    error: 0,
  },
}) => {
  const getStatusVariant = (): "default" | "success" | "warning" | "error" => {
    if (stats.error > 0) return "error"
    if (stats.applied > 0) return "success"
    return "default"
  }

  const getStatusText = (): string => {
    if (stats.error_message) return "Error"
    if (stats.last_run) return "Active"
    return "Ready"
  }

  return (
    <AppShell
      appTitle="JobFlow"
      userName="Claimant Name"
      statusText={getStatusText()}
      statusVariant={getStatusVariant()}
      activeRoute="/status"
    >
      <div className="space-y-6">
        <PageHeader
          title="Status"
          description="View your application statistics"
        />

        {/* Error Message */}
        {stats.error_message && (
          <ErrorState
            title="Error occurred"
            message={stats.error_message}
            affectsCompliance={false}
          />
        )}

        {/* No Runs Message */}
        {!stats.last_run && (
          <EmptyState
            title="No runs recorded yet"
            description="Configure your profile and start a run to see statistics here."
          />
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Applications"
            value={stats.total}
          />
          <KPICard
            title="Applied"
            value={stats.applied}
            variant="success"
          />
          <KPICard
            title="Skipped"
            value={stats.skip}
            variant="warning"
          />
          <KPICard
            title="Errors"
            value={stats.error}
            variant="error"
          />
        </div>

        {/* Last Run Info */}
        {stats.last_run && (
          <Card>
            <CardHeader>
              <CardTitle>Last Run</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{stats.last_run}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4">
          <form method="post" action="/run">
            <Button type="submit" variant="default">
              Start New Run
            </Button>
          </form>
          <a href="/setup">
            <Button variant="outline">Edit Configuration</Button>
          </a>
          <a href="/">
            <Button variant="outline">Home</Button>
          </a>
        </div>
      </div>
    </AppShell>
  )
}

