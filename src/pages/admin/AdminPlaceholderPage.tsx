/**
 * Reusable admin placeholder page.
 * Used for admin routes that are not yet implemented.
 */

import * as React from "react"
import { PageHeader } from "@/components/shared"
import { Card, CardContent } from "@/components/ui/card"

export interface AdminPlaceholderPageProps {
  title: string
  description: string
}

export const AdminPlaceholderPage: React.FC<AdminPlaceholderPageProps> = ({
  title,
  description,
}) => {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card className="border-border-default bg-surface-DEFAULT">
        <CardContent className="pt-6">
          <p className="text-sm text-text-secondary">
            This section is under development. Full functionality will be available in a future release.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
