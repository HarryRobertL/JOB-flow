# AutoApplyer AI - Product Specification

**Version**: 1.0  
**Date**: 2025-01-15  
**Status**: DWP Pilot SaaS Platform

---

## Product Description

AutoApplyer AI is a DWP-facing SaaS platform that automates Universal Credit job search and compliance for claimants and work coaches. The system acts as a digital assistant that finds suitable job roles, automatically applies where permitted, and logs all activity as evidence for weekly Universal Credit compliance requirements. For DWP staff, the platform provides clean dashboards showing claimant activity, sanctions risk, and outcomes at both individual and regional levels.

The commercial unit is structured as a 5,000 claimant pilot, with a clear path to national scale as a paid SaaS service. The platform must be safe and simple to deploy, with clear separation between claimant-facing views and staff/admin views, and a clean, accessible design suitable for government users.

---

## Primary Users

### 1. Universal Credit Claimant
- **Role**: `claimant`
- **Access**: `/app/*` routes
- **Needs**:
  - Simple onboarding to create profile and configure job search preferences
  - View suggested job roles and approve/reject auto-applications
  - See weekly compliance timeline showing applications sent and evidence
  - Update profile, CV, and preferences over time
  - Understand compliance status and requirements

### 2. Work Coach / DWP Staff Member
- **Role**: `coach`
- **Access**: `/staff/work-coach/*` routes
- **Needs**:
  - Dashboard showing assigned claimants with compliance status
  - Search and filter claimants by status, regime level, region, jobcentre
  - View detailed claimant record with job search evidence, counts, and flags
  - Export or print weekly reports for audits and appointments
  - Take compliance actions (warnings, notes, adjustments)

### 3. System Admin / DWP Regional Manager
- **Role**: `admin`
- **Access**: `/staff/dwp/*` and `/staff/admin/*` routes
- **Needs**:
  - Regional dashboard with aggregated metrics and time series
  - User management (create/edit users, assign coaches to claimants)
  - System configuration (compliance thresholds, regime levels, requirements)
  - Advanced reporting and analytics
  - Pilot/control group management
  - Audit log of all system actions

---

## Core Flows for Claimants

### 1. Onboard and Create Profile

**Flow**: New claimant signs up → Multi-step onboarding → Profile created

**Steps**:
1. Claimant lands on public landing page
2. Clicks "Get Started" or "Sign Up"
3. Completes multi-step onboarding form:
   - **Step 1**: Profile (email, name, phone, location, postcode)
   - **Step 2**: Skills & Experience (skills list, experience level, notice period, work authorization)
   - **Step 3**: Job Preferences (preferred job types, locations, salary min, remote preference, max commute)
   - **Step 4**: Automation Preferences (auto-apply enabled, daily cap, require review, CV path, cover letter template)
4. System creates claimant profile and initial `config.yaml`
5. Redirects to confirmation page with profile summary
6. Redirects to dashboard

**Current State**: Component exists (`OnboardingPage.tsx`) but not routed. Backend needs profile creation endpoint.

**Missing**: 
- Backend endpoint to save onboarding data
- Route to access onboarding flow
- Integration with config.yaml creation

---

### 2. Connect or Configure Job Boards

**Flow**: Claimant configures job search preferences → System connects to job boards

**Steps**:
1. From dashboard or settings, claimant navigates to job search configuration
2. Configures one or more job searches:
   - Platform (Indeed, Greenhouse, Lever)
   - Query/keywords
   - Location and radius
   - Salary minimum
   - Remote preference
   - Daily application cap
3. System validates configuration
4. For first-time setup, system may prompt for job board account login (handled via browser automation)
5. Configuration saved to `config.yaml`

**Current State**: Legacy `/setup` route exists (Jinja template). React version needed in settings page.

**Missing**:
- React-based settings page with job search configuration
- UI for managing multiple job searches
- Connection status indicators for job boards

---

### 3. See a List of Suggested Roles

**Flow**: System finds jobs → Claimant reviews suggestions → Approves or rejects

**Steps**:
1. System runs automated job search based on configured criteria
2. Jobs are discovered and stored in a queue
3. Claimant navigates to "Jobs" or "Search" page
4. Sees list of suggested roles with:
   - Job title, company, location
   - Salary range (if available)
   - Job description preview
   - Match score/reason
   - Application status (pending, approved, rejected, applied)
5. Can filter by platform, location, salary, date
6. Can click to view full job details
7. Can approve or reject individual jobs
8. Can approve/reject in batch

**Current State**: Component doesn't exist. Backend has job search logic but no API to return job listings.

**Missing**:
- Job search/discovery page component
- Backend API to return job listings
- Job queue/storage system
- Match scoring logic
- Batch approval/rejection UI

---

### 4. Approve or Reject Auto Applications

**Flow**: System queues applications → Claimant reviews batch → Approves → System applies

**Steps**:
1. System finds jobs matching criteria and queues them for review (if `requireReview: true`)
2. Claimant sees notification or badge on dashboard: "X applications pending review"
3. Navigates to "Review Applications" page
4. Sees batch of applications with:
   - Job title, company, location
   - Application preview (what will be sent)
   - CV and cover letter that will be used
5. Can approve or reject individual applications
6. Can approve all or reject all
7. On approval, system applies to jobs (via automation engine)
8. Applications move to "Applied" status and appear in activity timeline

**Current State**: Component exists (`ApplicationBatchConfirmationPage.tsx`) but not routed. Backend needs batch approval endpoint.

**Missing**:
- Route to application review page
- Backend endpoint to accept batch approvals
- Integration with automation engine to trigger applications
- Real-time status updates

---

### 5. View Weekly Compliance Timeline

**Flow**: Claimant views dashboard → Sees compliance status and activity timeline

**Steps**:
1. Claimant logs in and lands on dashboard
2. Sees compliance summary card:
   - Applications this week: X / Y required
   - Compliance status: On Track / At Risk / Non-Compliant
   - Days until compliance period ends
3. Sees activity timeline showing:
   - All applications sent this week (chronological)
   - Status of each (applied, skipped, error)
   - Job title, company, platform
   - Timestamp
4. Can click on activity item to see details
5. Can export weekly report as PDF/CSV for work coach meetings

**Current State**: Dashboard exists (`ClaimantDashboard.tsx`) with compliance summary and activity timeline. Backend API exists (`/api/claimant/status`).

**Missing**:
- Export functionality for weekly reports
- Detailed view for individual activity items
- Historical compliance data (previous weeks)

---

## Core Flows for Staff

### 1. Log in to Coach Dashboard

**Flow**: Work coach logs in → Sees dashboard with assigned claimants

**Steps**:
1. Work coach navigates to `/login`
2. Enters email and password
3. System authenticates and creates session
4. Redirects to `/staff/work-coach` dashboard
5. Sees list of assigned claimants with:
   - Name, jobcentre, region
   - Compliance status (On Track / At Risk / Non-Compliant)
   - Applications this week
   - Last activity date
   - Risk flags

**Current State**: Login page exists. Dashboard exists (`WorkCoachDashboard.tsx`) and is routed. Backend API exists.

**Status**: ✅ Mostly complete. May need refinement.

---

### 2. Search and View Claimant Record

**Flow**: Coach searches for claimant → Views detailed record

**Steps**:
1. From dashboard, coach uses search bar or filters
2. Filters by:
   - Compliance status
   - Regime level
   - Region
   - Jobcentre
   - Name (search)
3. Clicks on claimant name or "View Details"
4. Navigates to individual claimant page
5. Sees detailed view:
   - Profile information
   - Compliance metrics (current week, historical)
   - Full activity log (all applications, sorted by date)
   - Notes and flags
   - Work coach actions history

**Current State**: Backend API exists (`/api/staff/work-coach/claimants/{id}`). Frontend detail page doesn't exist.

**Missing**:
- Individual claimant detail page component
- Route to `/staff/work-coach/claimants/{id}`
- Notes/actions interface

---

### 3. View Job Search Evidence, Counts and Flags

**Flow**: Coach views claimant record → Sees evidence and compliance data

**Steps**:
1. Coach is on individual claimant detail page
2. Sees evidence section with:
   - Applications this week: count and list
   - Applications by platform (Indeed, Greenhouse, Lever)
   - Applications by status (applied, skipped, error)
   - Weekly compliance timeline
   - Compliance flags (e.g., "Only 3 applications this week", "No activity in 5 days")
3. Can click on individual application to see:
   - Job title, company, platform
   - Application timestamp
   - Status and any error messages
   - Screenshot/artifact if available
4. Can filter activity log by date range, platform, status

**Current State**: Backend API returns activity log. Frontend needs detail page to display it.

**Missing**:
- Claimant detail page with evidence display
- Filtering and search within activity log
- Flag generation and display logic

---

### 4. Export or Print Weekly Report

**Flow**: Coach generates report → Exports for audit/appointment

**Steps**:
1. Coach is on individual claimant detail page or dashboard
2. Clicks "Export Report" or "Print Report"
3. Selects date range (default: current compliance week)
4. Selects format (PDF, CSV)
5. System generates report with:
   - Claimant information
   - Compliance summary
   - Activity log for selected period
   - Compliance flags and notes
6. Report downloads or opens in new tab
7. Coach can print or save for appointment/audit

**Current State**: Component exists (`ExportLogDialog.tsx`) but may need enhancement. Backend needs export endpoint.

**Missing**:
- Backend endpoint to generate PDF/CSV reports
- Report template/formatter
- Print-friendly styling

---

## Non-Functional Requirements

### Deployment & Operations
- **Pilot Deployment**: Must be safe and simple to deploy for 5,000 claimant pilot
- **Scalability**: Architecture should support national scale (hundreds of thousands of claimants)
- **Reliability**: System should handle failures gracefully with user-facing error messages
- **Monitoring**: Basic logging and error tracking (can start simple, enhance later)

### Security
- **Authentication**: Secure session management with HTTP-only cookies
- **Authorization**: Role-based access control (claimant, coach, admin)
- **Data Protection**: Sensitive data (passwords, session secrets) must not be committed to version control
- **HTTPS**: Production deployment must use HTTPS (session cookies marked secure)

### Design & Accessibility
- **Clean Design**: Professional, government-appropriate aesthetic
- **Accessibility**: WCAG AA compliance (keyboard navigation, screen readers, color contrast)
- **Readability**: Clear typography, sufficient spacing, readable for all government users
- **Responsive**: Works on desktop, tablet, and mobile (mobile-first for claimants, desktop for staff)

### Separation of Concerns
- **Claimant Views**: All claimant functionality under `/app/*` routes
- **Staff Views**: All staff functionality under `/staff/*` routes
- **Admin Views**: All admin functionality under `/staff/admin/*` routes
- **Clear Navigation**: Users should never see links or pages they can't access

### Data & Compliance
- **Evidence Logging**: All job search activity must be logged with timestamps
- **Audit Trail**: Staff actions (compliance actions, notes) should be logged
- **Data Retention**: Clear policy on how long data is retained (TBD with DWP)
- **Export**: Users and staff must be able to export their data

---

## Technical Architecture

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite for users (`data/auth.db`), CSV for logs (`data/logs.csv`), YAML for config (`config.yaml`)
- **Job Automation**: Playwright-based browser automation (Indeed, Greenhouse, Lever adapters)
- **API**: RESTful JSON APIs with cookie-based authentication

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **UI**: Tailwind CSS + shadcn/ui components
- **State**: React Context for auth, local state for components
- **API Client**: Fetch-based client with cookie handling (`src/lib/apiClient.ts`)

### Future Considerations
- **Database Migration**: May need to migrate from SQLite/CSV to PostgreSQL for scale
- **Job Queue**: May need dedicated job queue (Redis, Celery) for application automation
- **Caching**: May need caching layer for job listings and metrics
- **Real-time Updates**: May need WebSockets for real-time status updates

---

## Success Metrics (Pilot)

### Claimant Metrics
- Number of claimants onboarded
- Average applications per claimant per week
- Compliance rate (claimants meeting weekly requirements)
- Time to first application
- User satisfaction (survey)

### Staff Metrics
- Time saved per work coach per week
- Number of compliance reports generated
- Staff satisfaction (survey)

### System Metrics
- Uptime/availability
- Average response time
- Error rate
- Job application success rate

---

## Out of Scope (For Now)

- Mobile native apps (web app is responsive)
- Multi-language support (English only for pilot)
- Integration with DWP legacy systems (manual export/import for now)
- Advanced AI/ML for job matching (basic keyword matching for pilot)
- Real-time chat/support (email/help page for now)
- Payment processing (pilot is free, payment integration later)

---

**End of Product Specification**

