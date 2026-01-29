/**
 * App Component
 * 
 * Root React component with React Router setup.
 * Handles routing for claimant, coach, and admin flows.
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ToastProvider } from "@/contexts/ToastContext"
import { ToastContainer } from "@/components/shared/ToastContainer"
import { ProtectedRoute } from "@/components/routing/ProtectedRoute"
import { ErrorBoundary } from "@/components/routing/ErrorBoundary"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { ForbiddenPage } from "@/pages/ForbiddenPage"
import { ServerErrorPage } from "@/pages/ServerErrorPage"
import { LoginPage } from "@/pages/LoginPage"
import { LandingPage } from "@/pages/LandingPage"
import { ClaimantDashboardContainer } from "@/pages/ClaimantDashboardContainer"
import { WorkCoachDashboardContainer } from "@/pages/WorkCoachDashboardContainer"
import { ClaimantDetailPage } from "@/pages/ClaimantDetailPage"
import { DWPDashboardContainer } from "@/pages/DWPDashboardContainer"
import { WorkCoachAppointmentsPage } from "@/pages/WorkCoachAppointmentsPage"
import { WorkCoachCompliancePage } from "@/pages/WorkCoachCompliancePage"
import { WorkCoachReportsPage } from "@/pages/WorkCoachReportsPage"
import {
  AdminUsersPage,
  AdminRegionsPage,
  AdminSettingsPage,
  AdminReportsPage,
  AdminAuditPage,
} from "@/pages/admin"
import { OnboardingPage } from "@/pages/OnboardingPage"
import { OnboardingConfirmationPage } from "@/pages/OnboardingConfirmationPage"
import { ApplicationBatchConfirmationPage } from "@/pages/ApplicationBatchConfirmationPage"
import { JobsPage } from "@/pages/JobsPage"
import { ApplicationHistoryPage } from "@/pages/ApplicationHistoryPage"
import { ComplianceLogPage } from "@/pages/ComplianceLogPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { SupportPage } from "@/pages/SupportPage"
import { ClaimantAppShell } from "@/components/layout/ClaimantAppShell"
import { CoachAppShell } from "@/components/layout/CoachAppShell"
import { AdminAppShell } from "@/components/layout/AdminAppShell"
import { InstallPrompt } from "@/components/pwa"
import { useOnlineStatus } from "@/lib/useOnlineStatus"
import { OfflineBanner } from "@/components/shared/OfflineBanner"

/** When no route matches: show 404 if authenticated, else redirect to login. */
function CatchAllRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bgBody">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jobflow" aria-hidden />
      </div>
    )
  }
  if (user) {
    return <NotFoundPage />
  }
  return <Navigate to="/login" replace />
}

// Wrapper component for OnboardingConfirmationPage to handle route state
function OnboardingConfirmationPageWrapper() {
  const location = useLocation()
  const navigate = useNavigate()
  const formData = location.state?.formData

  const handleComplete = () => {
    navigate("/app/dashboard", { replace: true })
  }

  const handleEdit = () => {
    navigate("/app/onboarding", { state: { formData } })
  }

  return (
    <ClaimantAppShell>
      <OnboardingConfirmationPage
        formData={formData}
        onComplete={handleComplete}
        onEdit={handleEdit}
      />
    </ClaimantAppShell>
  )
}


function App() {
  const isOnline = useOnlineStatus()

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
          <OfflineBanner isOffline={!isOnline} />
          <InstallPrompt />
          <ToastContainer />
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Claimant routes */}
          <Route
            path="/app/onboarding"
            element={
              <ProtectedRoute allowedRoles={["claimant"]}>
                <ClaimantAppShell>
                  <OnboardingPage />
                </ClaimantAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/onboarding/confirmation"
            element={
              <ProtectedRoute allowedRoles={["claimant"]}>
                <OnboardingConfirmationPageWrapper />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/dashboard"
            element={
              <ProtectedRoute allowedRoles={["claimant"]}>
                <ClaimantAppShell>
                  <ClaimantDashboardContainer />
                </ClaimantAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/jobs"
            element={
              <ProtectedRoute allowedRoles={["claimant"]}>
                <ClaimantAppShell>
                  <JobsPage />
                </ClaimantAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/applications"
            element={
              <ProtectedRoute allowedRoles={["claimant"]}>
                <ClaimantAppShell>
                  <ApplicationHistoryPage />
                </ClaimantAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/applications/review"
            element={
              <ProtectedRoute allowedRoles={["claimant"]}>
                <ClaimantAppShell>
                  <ApplicationBatchConfirmationPage />
                </ClaimantAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/compliance"
            element={
              <ProtectedRoute allowedRoles={["claimant"]}>
                <ClaimantAppShell>
                  <ComplianceLogPage />
                </ClaimantAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/settings"
            element={
              <ProtectedRoute allowedRoles={["claimant"]}>
                <ClaimantAppShell>
                  <SettingsPage />
                </ClaimantAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/support"
            element={
              <ProtectedRoute allowedRoles={["claimant"]}>
                <ClaimantAppShell>
                  <SupportPage />
                </ClaimantAppShell>
              </ProtectedRoute>
            }
          />

          {/* Staff routes - Work Coach */}
          <Route
            path="/staff/work-coach"
            element={
              <ProtectedRoute allowedRoles={["coach", "admin"]}>
                <CoachAppShell>
                  <WorkCoachDashboardContainer />
                </CoachAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/work-coach/appointments"
            element={
              <ProtectedRoute allowedRoles={["coach", "admin"]}>
                <CoachAppShell>
                  <WorkCoachAppointmentsPage />
                </CoachAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/work-coach/compliance"
            element={
              <ProtectedRoute allowedRoles={["coach", "admin"]}>
                <CoachAppShell>
                  <WorkCoachCompliancePage />
                </CoachAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/work-coach/reports"
            element={
              <ProtectedRoute allowedRoles={["coach", "admin"]}>
                <CoachAppShell>
                  <WorkCoachReportsPage />
                </CoachAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/work-coach/claimants/:id"
            element={
              <ProtectedRoute allowedRoles={["coach", "admin"]}>
                <CoachAppShell>
                  <ClaimantDetailPage />
                </CoachAppShell>
              </ProtectedRoute>
            }
          />

          {/* Staff routes - Admin/DWP */}
          <Route
            path="/staff/dwp"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAppShell>
                  <DWPDashboardContainer />
                </AdminAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/admin/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAppShell>
                  <AdminUsersPage />
                </AdminAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/admin/regions"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAppShell>
                  <AdminRegionsPage />
                </AdminAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/admin/settings"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAppShell>
                  <AdminSettingsPage />
                </AdminAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/admin/reports"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAppShell>
                  <AdminReportsPage />
                </AdminAppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/admin/audit"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAppShell>
                  <AdminAuditPage />
                </AdminAppShell>
              </ProtectedRoute>
            }
          />

          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Error pages */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/500" element={<ServerErrorPage />} />

          {/* Catch all: 404 when authenticated, else redirect to login */}
          <Route path="*" element={<CatchAllRoute />} />
        </Routes>
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
