# AutoApplyer Route Inventory

Generated: 2025-01-15  
Last Updated: 2025-01-15  
Verified: 2025-01-15

## Backend Framework
- **Framework**: FastAPI (Python)
- **Entry Point**: `autoapply/server.py`
- **Port**: 8000 (default)
- **Static Files**: Served from `/static` and `/public` directories
- **React Build**: Served from `/dist` directory

## Frontend Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **UI Library**: Tailwind CSS + shadcn/ui components
- **Entry Point**: `src/main.tsx` → `src/App.tsx`

## Database/Persistence
- **Auth Store**: SQLite database at `data/auth.db` (via `autoapply/auth_store.py`)
- **Application Logs**: CSV file at `data/logs.csv` (via `autoapply/core/storage.py`)
- **Configuration**: YAML file at `config.yaml` (per-claimant config)

---

## Backend HTTP Routes (FastAPI)

All routes defined in `autoapply/server.py`.

### Authentication Routes

| Path | Method | Handler | Auth Required | Role | Description |
|------|--------|---------|---------------|------|-------------|
| `/auth/login` | POST | `login()` | No | Any | Login endpoint. Returns session cookie and user info. |
| `/auth/logout` | POST | `logout()` | Optional | Any | Logout endpoint. Clears session cookie. |
| `/auth/register` | POST | `register()` | No | Any | Register new user (dev/seed only). Creates user with email, password, role. |
| `/auth/me` | GET | `get_current_user_info()` | Yes | Any | Get current authenticated user info. |

**Session Management**: Cookie-based sessions using `autoapply_session` cookie (HTTP-only, 7-day expiry).

### React App Routes (SPA Fallback)

| Path | Method | Handler | Auth Required | Role | Description |
|------|--------|---------|---------------|------|-------------|
| `/` | GET | `root()` | No | Public | Serve React app landing page. |
| `/login` | GET | `login_page()` | No | Public | Serve React app login page. |
| `/app/{path:path}` | GET | `serve_react_app_app()` | No | Public | Serve React app for all `/app/*` routes (claimant routes). |
| `/staff/{path:path}` | GET | `serve_react_staff_app()` | No | Public | Serve React app for all `/staff/*` routes (staff routes). |

**Note**: These routes serve the React SPA. Actual route protection happens client-side via React Router and `ProtectedRoute` component.

### Legacy Template Routes (Jinja2)

| Path | Method | Handler | Auth Required | Role | Description |
|------|--------|---------|---------------|------|-------------|
| `/legacy-landing` | GET | `legacy_landing()` | No | Public | Legacy landing page (Jinja template). |
| `/setup` | GET | `setup_get()` | Yes | Claimant | Show setup form with current configuration (account, CV, cover letter, search params). |
| `/setup` | POST | `setup_post()` | Yes | Claimant | Save configuration from form submission. Updates `config.yaml`. |
| `/run` | POST | `run_trigger()` | Yes | Claimant | Trigger the AutoApplyer engine in a background thread. Starts job application automation. |
| `/status` | GET | `status()` | Yes | Claimant | Show status summary from `logs.csv` (total, applied, skip, error counts, last run time). |

### Claimant API Routes

| Path | Method | Handler | Auth Required | Role | Description |
|------|--------|---------|---------------|------|-------------|
| `/api/claimant/status` | GET | `get_claimant_status_api()` | Yes | Claimant | Get claimant status and activity data as JSON. Returns stats and recent activity log (last 50 entries). |
| `/api/claimant/jobs` | GET | `get_job_listings()` | Yes | Claimant | Get job listings from queue. Supports filters: `platform`, `status`, `start_date`, `end_date`, `limit`, `offset`. Returns jobs from `data/jobs_queue.json`. |
| `/api/claimant/applications/batch` | POST | `batch_approve_applications()` | Yes | Claimant | Batch approve or reject applications. Accepts list of job IDs with actions. Updates jobs queue and triggers automation for approved jobs. |
| `/api/claimant/profile` | PUT | `update_profile()` | Yes | Claimant | Update claimant profile and preferences. Updates `config.yaml` with new settings. |

### Staff API Routes (Work Coach)

| Path | Method | Handler | Auth Required | Role | Description |
|------|--------|---------|---------------|------|-------------|
| `/api/staff/work-coach/claimants` | GET | `get_work_coach_claimants()` | Yes | Coach, Admin | List claimants assigned to work coach. Supports filters: `status`, `regime_level`, `region`, `jobcentre`, `sort_by`, `sort_order`. Returns compliance metrics. |
| `/api/staff/work-coach/claimants/{claimant_id}` | GET | `get_claimant_detail()` | Yes | Coach, Admin | Get detailed information for a specific claimant including full activity log (last 50 entries). |
| `/api/staff/work-coach/reports/export` | GET | `export_report()` | Yes | Coach, Admin | Export CSV report for claimant. Supports filters: `claimant_id`, `start_date`, `end_date`, `format` (CSV). Returns CSV file download. |

### Staff API Routes (DWP/Admin)

| Path | Method | Handler | Auth Required | Role | Description |
|------|--------|---------|---------------|------|-------------|
| `/api/staff/dwp/metrics` | GET | `get_dwp_metrics()` | Yes | Admin, Coach | Get aggregated regional metrics and time series data. Supports filters: `region`, `jobcentre`, `start_date`, `end_date`. Returns total claimants, average applications/week, sanction rate, weekly time series. |
| `/api/staff/regions` | GET | `get_regions()` | Yes | Admin, Coach | Get list of available regions (hardcoded: Wales, England, Scotland, Northern Ireland). |
| `/api/staff/jobcentres` | GET | `get_jobcentres()` | Yes | Admin, Coach | Get list of available jobcentres, optionally filtered by `region` query param. |

### Analytics Routes

| Path | Method | Handler | Auth Required | Role | Description |
|------|--------|---------|---------------|------|-------------|
| `/api/analytics` | POST | `track_analytics()` | Optional | Any | Track analytics events from frontend. Events logged to `data/analytics.jsonl` (JSONL format). Accepts `AnalyticsEvent` model with `event`, `category`, `timestamp`, `properties`. |

### Static File Routes

| Path | Method | Handler | Auth Required | Role | Description |
|------|--------|---------|---------------|------|-------------|
| `/static/*` | GET | StaticFiles mount | No | Public | Serve static files (logos, assets) from `ui/static/`. |
| `/assets/*` | GET | StaticFiles mount | No | Public | Serve React build assets from `dist/assets/`. |
| `/public/*` | GET | StaticFiles mount | No | Public | Serve public assets from `public/`. |

---

## Frontend Routes (React Router)

Routes defined in `src/App.tsx`.

### Public Routes

| Path | Component | Auth Required | Role | Description |
|------|-----------|---------------|------|-------------|
| `/` | `LandingPage` | No | Public | Public landing page with welcome message. |
| `/login` | `LoginPage` | No | Public | Login page for all user types. |

### Claimant Routes (`/app/*`)

| Path | Component | Auth Required | Role | Description |
|------|-----------|---------------|------|-------------|
| `/app/onboarding` | `OnboardingPage` | Yes | Claimant | Multi-step onboarding flow (profile, skills, preferences, automation settings). |
| `/app/onboarding/confirmation` | `OnboardingConfirmationPage` | Yes | Claimant | Confirmation page after onboarding completion. Shows profile summary. |
| `/app/dashboard` | `ClaimantDashboardContainer` | Yes | Claimant | Main claimant dashboard showing compliance status, upcoming tasks, recent activity timeline. |
| `/app/jobs` | `JobsPage` | Yes | Claimant | Job search/discovery page with filtering and batch approval. |
| `/app/applications` | `ApplicationHistoryPage` | Yes | Claimant | Application history page showing all submitted applications with filtering. |
| `/app/applications/review` | `ApplicationBatchConfirmationPage` | Yes | Claimant | Batch review page for applications before auto-applying. Shows list of jobs to approve/reject. |
| `/app/compliance` | `ComplianceLogPage` | Yes | Claimant | Compliance log page showing weekly application totals and evidence for work coach meetings. |
| `/app/settings` | `SettingsPage` | Yes | Claimant | Settings page for managing profile and automation preferences. |
| `/app/support` | `SupportPage` | Yes | Claimant | Help and support page with FAQs and contact information. |

### Staff Routes - Work Coach (`/staff/work-coach`)

| Path | Component | Auth Required | Role | Description |
|------|-----------|---------------|------|-------------|
| `/staff/work-coach` | `WorkCoachDashboardContainer` | Yes | Coach, Admin | Dashboard for work coaches to view assigned claimants, filter by compliance status, view details, activity logs. Fully data-driven using `/api/staff/work-coach/claimants` and `/api/staff/work-coach/claimants/{id}` endpoints. |

**Missing Work Coach Routes**:
- `/staff/work-coach/claimants/{id}` → Individual claimant detail/management page
- `/staff/work-coach/appointments` → Appointments/calendar view
- `/staff/work-coach/compliance` → Compliance actions interface
- `/staff/work-coach/reports` → Reports/export page

### Staff Routes - Admin/DWP (`/staff/dwp`)

| Path | Component | Auth Required | Role | Description |
|------|-----------|---------------|------|-------------|
| `/staff/dwp` | `DWPDashboardContainer` | Yes | Admin | Regional/central DWP dashboard for aggregated metrics, time series charts, KPI cards. Fully data-driven using `/api/staff/dwp/metrics`, `/api/staff/regions`, and `/api/staff/jobcentres` endpoints. |

**Missing Admin Routes**:
- `/staff/admin/users` → User management interface
- `/staff/admin/regions` → Regional/jobcentre management
- `/staff/admin/settings` → System configuration
- `/staff/admin/reports` → Advanced reporting
- `/staff/admin/pilot` → Pilot/control group management
- `/staff/admin/audit` → Audit log viewer

### Error Routes

| Path | Component | Auth Required | Role | Description |
|------|-----------|---------------|------|-------------|
| `*` (catch-all) | `Navigate to /login` | No | Public | All unmatched routes redirect to `/login`. |

**Missing Error Routes**:
- `/404` → 404 Not Found page
- `/500` → 500 Server Error page
- `/403` → 403 Forbidden page

---

## Authentication & Authorization

### Session Management
- **Method**: HTTP-only cookies (`autoapply_session`)
- **Duration**: 7 days
- **Secret**: Environment variable `AUTOAPPLYER_SESSION_SECRET` or default (should be changed in production)
- **Implementation**: `autoapply/auth.py` (signed tokens with HMAC-SHA256)

### User Roles
- **`claimant`**: Universal Credit claimants using the system
- **`coach`**: Work coaches who manage claimants
- **`admin`**: DWP staff with full system access

### Role-Based Access Control
- Backend: `check_role()` function in `autoapply/auth.py` enforces role requirements
- Frontend: `ProtectedRoute` component in `src/components/routing/ProtectedRoute.tsx` checks roles client-side

---

## Missing but Implied Routes

### Claimant-Facing
1. **Onboarding Flow** (`/app/onboarding`)
   - Multi-step form to collect profile, skills, preferences
   - Component exists: `OnboardingPage.tsx`
   - Backend: Should create/update claimant profile and config

2. **Job Search/Discovery** (`/app/jobs` or `/app/search`)
   - Browse and search job listings
   - Preview job details
   - Queue applications for review
   - Component doesn't exist yet

3. **Application Review** (`/app/applications/review`)
   - Review batch of applications before auto-applying
   - Component exists: `ApplicationBatchConfirmationPage.tsx`
   - Backend: Should accept batch approval/rejection

4. **Application History** (`/app/applications`)
   - Full list of all applications with filtering
   - Currently placeholder, needs implementation

5. **Profile/Settings** (`/app/settings`)
   - Update account info, CV, preferences
   - Currently placeholder, needs implementation

6. **Help/Support** (`/app/help` or `/help`)
   - FAQs, guides, contact info
   - Component doesn't exist yet

### Staff-Facing
1. **Individual Claimant Management** (`/staff/work-coach/claimants/{id}`)
   - Deep-dive view of single claimant
   - Notes, history, compliance actions
   - Backend API exists, frontend page needed

2. **Appointments/Calendar** (`/staff/work-coach/appointments`)
   - View and manage appointments with claimants
   - Component doesn't exist yet

3. **Compliance Actions** (`/staff/work-coach/compliance`)
   - Interface for warnings, sanctions, adjustments
   - Component doesn't exist yet

4. **Reports/Export** (`/staff/work-coach/reports`)
   - Generate CSV/PDF reports for audits
   - Component doesn't exist yet

### Admin-Facing
1. **User Management** (`/staff/admin/users`)
   - View/edit/create users, assign coaches
   - Component doesn't exist yet

2. **Regional Management** (`/staff/admin/regions`)
   - CRUD operations for regions and jobcentres
   - Component doesn't exist yet

3. **System Configuration** (`/staff/admin/settings`)
   - Compliance thresholds, regime levels, requirements
   - Component doesn't exist yet

4. **Advanced Reporting** (`/staff/admin/reports`)
   - Custom report builder, scheduled reports
   - Component doesn't exist yet

5. **Pilot Management** (`/staff/admin/pilot`)
   - Configure and manage pilot/control groups
   - Component doesn't exist yet

6. **Audit Log** (`/staff/admin/audit`)
   - View all system actions by users/staff
   - Component doesn't exist yet

---

## API Endpoints Status

### ✅ Implemented (2025-01-15)

1. **`POST /api/analytics`** ✅
   - Implemented in `autoapply/server.py`
   - Accepts analytics events from frontend
   - Logs to `data/analytics.jsonl`

2. **`GET /api/claimant/jobs`** ✅
   - Implemented in `autoapply/server.py`
   - Returns job listings from `data/jobs_queue.json`
   - Supports filtering by platform, status, date

3. **`POST /api/claimant/applications/batch`** ✅
   - Implemented in `autoapply/server.py`
   - Accepts batch of applications to review/approve
   - Updates jobs queue and triggers automation

4. **`PUT /api/claimant/profile`** ✅
   - Implemented in `autoapply/server.py`
   - Updates claimant profile and preferences
   - Updates `config.yaml` with new settings

5. **`GET /api/staff/work-coach/reports/export`** ✅
   - Implemented in `autoapply/server.py`
   - Generates CSV reports for claimants
   - Supports date range filtering

### ❌ Still Missing

1. **`GET /api/claimant/applications`**
   - Should return full application history with pagination/filtering
   - Needed for application history page
   - Could use existing `/api/claimant/status` endpoint (returns last 50 entries) or extend it

2. **`GET /api/staff/work-coach/appointments`**
   - Should return appointments for work coach
   - Needed for appointments/calendar view
   - Feature may not be in scope for MVP

3. **`POST /api/staff/work-coach/compliance/actions`**
   - Should create compliance actions (warnings, sanctions)
   - Needed for compliance management
   - Feature may not be in scope for MVP

---

## Summary

### Current State
- **Backend**: FastAPI server with authentication, claimant setup/status, staff dashboards APIs
- **Frontend**: React SPA with routing for basic claimant and staff dashboards
- **Auth**: Cookie-based sessions with role-based access control
- **Data**: SQLite for users, CSV for application logs, YAML for config

### Critical Gaps (Updated 2025-01-15)
1. ✅ Onboarding flow routed (`/app/onboarding`, `/app/onboarding/confirmation`) - **DONE**
2. ✅ Job search/discovery page implemented (`/app/jobs`) - **DONE**
3. ✅ Application review/batch approval flow routed (`/app/applications/review`) - **DONE**
4. ✅ Application history page implemented (`/app/applications`) - **DONE**
5. ✅ Settings/profile management implemented (`/app/settings`) - **DONE**
6. ✅ Compliance log page implemented (`/app/compliance`) - **DONE**
7. ✅ Support page implemented (`/app/support`) - **DONE**
8. ⚠️ Many staff/admin management interfaces missing (claimant detail page, admin pages)
9. ✅ Analytics endpoint implemented (`POST /api/analytics`) - **DONE**

### Priority Fixes (Updated 2025-01-15)
1. ✅ Route existing components (onboarding, application review) - **DONE**
2. ✅ Implement missing API endpoints (analytics, jobs, batch approval, profile update, export) - **DONE**
3. ✅ Build job search/discovery page - **DONE**
4. ✅ Complete application history and settings pages - **DONE**
5. ⚠️ Add staff management interfaces (claimant detail page, admin pages)

---

**End of Route Inventory**
