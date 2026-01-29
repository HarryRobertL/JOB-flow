/**
 * SupportPage Component
 * 
 * Help and support page for claimants with FAQs and contact information.
 */

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared"
import { HelpCircle, Mail, FileText, Shield } from "lucide-react"

export const SupportPage: React.FC = () => {
  return (
    <div className="space-y-6" data-testid="support-page">
      <PageHeader
        title="Support and how JobFlow works"
        description="Get help with JobFlow, understand how it works, and find answers to common questions about the automated job application process."
      />

      {/* What is JobFlow */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary-600" />
            <CardTitle>What is JobFlow?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-primary">
            JobFlow is an automated job application tool designed to help Universal Credit claimants
            meet their job search requirements efficiently. It searches for jobs that match your skills
            and preferences, and can automatically submit applications on your behalf.
          </p>
          <p className="text-text-secondary">
            All application activity is automatically logged and can be shared with your work coach as
            evidence of your job search efforts.
          </p>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            <CardTitle>How does it work?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-text-primary">1. Set up your profile</p>
              <p className="text-sm text-text-secondary">
                Complete the onboarding process to tell us about your skills, experience, and job preferences.
              </p>
            </div>
            <div>
              <p className="font-semibold text-text-primary">2. Job discovery</p>
              <p className="text-sm text-text-secondary">
                JobFlow searches job boards like Indeed, Greenhouse, and Lever for jobs that match your criteria.
              </p>
            </div>
            <div>
              <p className="font-semibold text-text-primary">3. Application process</p>
              <p className="text-sm text-text-secondary">
                Depending on your settings, applications can be submitted automatically or require your review first.
                You can also browse and approve jobs manually from the Jobs page.
              </p>
            </div>
            <div>
              <p className="font-semibold text-text-primary">4. Compliance logging</p>
              <p className="text-sm text-text-secondary">
                All applications are logged automatically. You can view your compliance log at any time
                to show your work coach evidence of your job search activity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Universal Credit */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            <CardTitle>Universal Credit and Evidence</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-primary">
            JobFlow helps you meet your Universal Credit job search requirements by automatically
            applying to suitable jobs and maintaining a detailed log of your activity.
          </p>
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
            <p className="text-sm text-primary-800">
              <strong>Important:</strong> Your compliance log shows weekly application totals and can be
              printed or exported to share with your work coach during appointments. This provides clear
              evidence of your job search efforts.
            </p>
          </div>
          <p className="text-sm text-text-secondary">
            You can view your compliance log from the Compliance Log page, which groups applications by week
            and shows whether you're meeting your weekly application requirements.
          </p>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="font-semibold text-text-primary mb-2">
              Can I disable automatic applications?
            </p>
            <p className="text-sm text-text-secondary">
              Yes. Go to Settings and uncheck "Enable automatic application". You can still browse jobs
              and approve them manually from the Jobs page.
            </p>
          </div>

          <div>
            <p className="font-semibold text-text-primary mb-2">
              How do I review applications before they're submitted?
            </p>
            <p className="text-sm text-text-secondary">
              Enable "Require manual review" in Settings. You'll receive notifications when jobs are found,
              and you can review and approve them from the Applications page.
            </p>
          </div>

          <div>
            <p className="font-semibold text-text-primary mb-2">
              Can I change my job preferences?
            </p>
            <p className="text-sm text-text-secondary">
              Yes. Go to Settings to update your remote work preference, commute distance, salary requirements,
              and other job search criteria.
            </p>
          </div>

          <div>
            <p className="font-semibold text-text-primary mb-2">
              How do I show my work coach my application activity?
            </p>
            <p className="text-sm text-text-secondary">
              Visit the Compliance Log page and use the Print or Export button to generate a report showing
              your weekly application totals. This can be shared during your work coach appointments.
            </p>
          </div>

          <div>
            <p className="font-semibold text-text-primary mb-2">
              What if I want to stop using JobFlow?
            </p>
            <p className="text-sm text-text-secondary">
              You can disable automatic applications in Settings at any time. Your application history and
              compliance log will remain available for your records.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary-600" />
            <CardTitle>Need more help?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-primary">
            If you have questions or need assistance, please contact your work coach or the support team.
          </p>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm text-text-secondary">
              <strong>Contact your work coach:</strong> Speak to your work coach during your regular appointments
              or contact your local Jobcentre Plus office.
            </p>
          </div>
          <p className="text-sm text-text-secondary">
            For technical issues with JobFlow, you can also reach out via email at{" "}
            <a
              href="mailto:support@autoapplyer.gov.uk"
              className="text-primary-600 hover:text-primary-700 underline"
            >
              support@autoapplyer.gov.uk
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

