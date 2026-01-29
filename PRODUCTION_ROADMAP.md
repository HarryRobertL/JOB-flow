# JobFlow / AutoApplyer — Production Roadmap

**Goal**: Overcome all identified gaps in priority order to reach full production quality (Silicon Valley / invested standard).

**Scope**: Claimant, Work Coach, and Admin flows; backend APIs; data model; security; observability; and polish.

---

## Phase 1: Claimant experience (foundation)

### 1.1 Settings page — real profile load and save

**Problem**: Settings uses status only; profile fields (name, email, discover-only, daily cap) are not loaded from or saved to GET/PUT profile.

**Steps**:
1. **Frontend** (`src/pages/SettingsPage.tsx`):
   - On mount, call `GET /api/claimant/profile` (already exists). Map response to form state (firstName, lastName, email, phone, postcode, discoverOnly, dailyCap, remotePreference, etc.).
   - On save, build payload from form and call `PUT /api/claimant/profile`. Show toast on success/error.
   - Add loading and error states; use existing FormField/FormErrorSummary.
2. **Backend**: Ensure `GET /api/claimant/profile` returns all fields the Settings form needs (including discoverOnly if stored in config or profile). If discoverOnly is not in config today, add it to config schema and GET/PUT profile.
3. **Acceptance**: Claimant can open Settings, see current name/email/preferences, change them, save, and see changes persist and reflected on dashboard/onboarding.

---

### 1.2 Weekly requirement source of truth

**Problem**: Dashboard/compliance use a default (e.g. 10 applications/week). Spec implies “agreed with work coach” target.

**Steps**:
1. **Data model**: Decide where required applications per week lives (e.g. claimant profile, regime level, or future “agreement” table). For minimal change: add `requiredApplicationsPerWeek` (or similar) to profile/config and to GET/PUT profile.
2. **Backend**: In `GET /api/claimant/status` and/or `GET /api/claimant/profile`, return `requiredApplicationsPerWeek`. In `PUT /api/claimant/profile`, accept and store it (optional; default e.g. 10).
3. **Frontend**: Claimant dashboard and compliance components read required applications from API instead of hardcoded default. Display “Your work coach has set a target of X applications per week” when present.
4. **Acceptance**: Required number is configurable and consistent across dashboard, compliance, and welcome banner.

---

### 1.3 Historical compliance (multi-week view)

**Problem**: Only “this week” is shown; spec asks for “past few weeks” and historical compliance.

**Steps**:
1. **Backend**: Add or extend endpoint (e.g. `GET /api/claimant/compliance` with `weeks=4`) to return weekly summaries: for each week, `week_start`, `applications_count`, `required`, `is_compliant`. Use existing logs/evidence to compute.
2. **Frontend**: On Compliance log page (and optionally dashboard), add a “Past weeks” section: list or table of last 4–6 weeks with same KPIs. Use design tokens and existing KPICard/StatusBadge.
3. **Acceptance**: Claimant can see at a glance whether they met requirements in past weeks.

---

### 1.4 Activity item detail view

**Problem**: Timeline shows list only; no way to see “why failed” or open artifact/screenshot.

**Steps**:
1. **Backend**: Ensure activity log entries include `notes`, `error_message`, and `artifact_url` (or path) when available. Expose artifact URL in API (e.g. signed or relative path) so frontend can open it.
2. **Frontend**: On dashboard and Application history (and claimant detail for coach), make each activity row clickable. Add a modal or slide-over that shows: job title, company, platform, timestamp, status, notes/error, and link to “View artifact” if present. Use existing Card/Modal primitives.
3. **Acceptance**: User can click an activity row and see full details and, when available, open the artifact.

---

### 1.5 PDF export (claimant evidence)

**Problem**: Only CSV export exists; spec and “evidence for work coach meetings” expect PDF.

**Steps**:
1. **Backend**: Add endpoint (e.g. `GET /api/claimant/evidence/export?format=pdf`) or extend existing export to support `format=pdf`. Use a library (e.g. WeasyPrint, reportlab, or generate HTML and convert) to produce a one-page PDF: claimant name, period, table of applications (date, job, company, platform, status). Return as `Content-Disposition: attachment`.
2. **Frontend**: On dashboard (and Compliance page), add “Download as PDF” next to existing “Download evidence” (CSV). Call export with `format=pdf`; trigger download. Toast on success/error.
3. **Acceptance**: Claimant can download a readable PDF for the current week to bring to appointments.

---

### 1.6 Onboarding “Skip for now” (optional)

**Problem**: Spec allows optional “Skip for now” with clear copy that dashboard will be limited.

**Steps**:
1. **Frontend**: On onboarding (e.g. step 1 or in header), add a discrete “Skip for now” link. On click: set a flag (e.g. `skippedOnboarding`) in profile or session; call `setClaimantOnboardingComplete()` so ProtectedRoute allows dashboard; navigate to `/app/dashboard`. Show one-time message on dashboard: “You skipped setup. Some features are limited until you complete your profile in Settings.”
2. **Backend**: No change if you use client-side flag + `setClaimantOnboardingComplete()`. If you persist “skipped”, add a field to profile and ensure GET profile returns it so returning users see limited state until they complete profile.
3. **Acceptance**: User can skip onboarding, land on dashboard with a clear limitation message, and complete profile later via Settings.

---

## Phase 2: Admin and platform (routes + data)

### 2.1 Admin routes and placeholder pages

**Problem**: Sidebar links to `/staff/admin/users`, `/staff/admin/regions`, `/staff/admin/settings`, `/staff/admin/reports`, `/staff/admin/audit` have no routes; users hit catch-all.

**Steps**:
1. **Frontend** (`src/App.tsx`): Add routes for each path under `ProtectedRoute` with `AdminAppShell`:
   - `/staff/admin/users` → `AdminUsersPage` (placeholder)
   - `/staff/admin/regions` → `AdminRegionsPage` (placeholder)
   - `/staff/admin/settings` → `AdminSettingsPage` (placeholder)
   - `/staff/admin/reports` → `AdminReportsPage` (placeholder)
   - `/staff/admin/audit` → `AdminAuditPage` (placeholder)
2. **Placeholder pages**: Create minimal pages (e.g. under `src/pages/admin/`): PageHeader + “Coming soon” or “Under development” + short description. Use design system; no broken links.
3. **Acceptance**: Admin can click every sidebar link and land on a valid page (placeholder or future real UI).

---

### 2.2 User management (admin)

**Problem**: No way to create/edit users or assign coaches to claimants.

**Steps**:
1. **Backend**:
   - Extend auth store or add `user_assignments` table: coach_id → list of claimant_ids (or user_id + role + assignment). Implement `GET /api/staff/admin/users` (list users with role, optional filter), `POST /api/staff/admin/users` (create user), `PATCH /api/staff/admin/users/{id}` (edit role, display_name, assignment). Restrict to admin role.
   - Add `GET /api/staff/admin/assignments` and `PUT /api/staff/admin/assignments` (or include in user PATCH) so coaches have “assigned claimants”.
2. **Frontend** (`AdminUsersPage`): Table of users (email, role, display_name, assigned claimants). “Add user” form (email, password, role, optional assignment). Edit row: change role, assign claimants (multi-select). Use existing Table, Form, Modal. Call new APIs.
3. **Acceptance**: Admin can create users, set role, and assign claimants to coaches; work coach dashboard only shows assigned claimants.

---

### 2.3 Work coach “assigned claimants” filter

**Problem**: Backend currently derives claimants from config/logs; no real assignment.

**Steps**:
1. **Backend**: `GET /api/staff/work-coach/claimants` must filter by current user when role is coach: return only claimants assigned to that coach (from Phase 2.2 assignment model). Admin may see all or filtered by selection.
2. **Frontend**: No change if API contract stays same (list of claimants). Ensure dashboard and claimant detail work when list is filtered by assignment.
3. **Acceptance**: Coach sees only their assigned claimants; admin sees scope per design (e.g. all or filterable).

---

### 2.4 System configuration (admin)

**Problem**: No UI for compliance thresholds, regime levels, or global requirements.

**Steps**:
1. **Backend**: Add config table or JSON file for system-wide settings: e.g. default `requiredApplicationsPerWeek`, list of regime levels, regional labels. Endpoints: `GET /api/staff/admin/settings`, `PUT /api/staff/admin/settings` (admin only).
2. **Frontend** (`AdminSettingsPage`): Form for default weekly requirement, regime list, and any other globals. Save via PUT. Show success/error toast.
3. **Acceptance**: Admin can change default compliance parameters; claimant and coach views respect them where applicable.

---

### 2.5 Audit log

**Problem**: No audit trail of staff or system actions.

**Steps**:
1. **Backend**: Introduce audit log store (e.g. SQLite table or JSONL): timestamp, actor_id, action (e.g. `user.created`, `claimant.assigned`, `export.report`), resource_type, resource_id, details. Middleware or helper to log on sensitive actions (user create/update, assignment change, export). Add `GET /api/staff/admin/audit` with filters (date range, actor, action).
2. **Frontend** (`AdminAuditPage`): Table of audit entries with date, actor, action, resource. Filters: date range, action type. Pagination. Use design system.
3. **Acceptance**: All sensitive admin and coach actions are logged and viewable by admin.

---

## Phase 3: Work coach depth

### 3.1 Notes and flags (claimant detail)

**Problem**: Notes section is UI-only; no persistence. No structured “flags” (e.g. at risk, no activity 5 days).

**Steps**:
1. **Backend**: Add `claimant_notes` store (e.g. table: claimant_id, author_id, created_at, body). Endpoints: `GET /api/staff/work-coach/claimants/{id}/notes`, `POST /api/staff/work-coach/claimants/{id}/notes`. Optionally add `flags` (computed or stored): e.g. “Only 3 applications this week”, “No activity in 5 days”. Return flags in claimant detail API.
2. **Frontend** (ClaimantDetailPage): Notes section: list of notes (author, date, body). “Add note” form; submit POST. Display flags in a small alerts or badges section at top of detail.
3. **Acceptance**: Coach can add and view notes per claimant; claimant detail shows simple risk/compliance flags.

---

### 3.2 Compliance actions (warnings / adjustments)

**Problem**: Spec asks for “compliance actions (warnings, notes, adjustments)”; not implemented.

**Steps**:
1. **Backend**: Define actions (e.g. “warning_issued”, “requirement_adjusted”). Store in audit log or dedicated `compliance_actions` table (claimant_id, coach_id, action_type, payload, timestamp). Endpoint: `POST /api/staff/work-coach/claimants/{id}/actions` and optionally `GET .../actions`.
2. **Frontend**: On claimant detail, “Actions” section: button “Issue warning” or “Log adjustment” opens small form (type, optional comment). Submit POST; refresh actions list. Show history of actions in timeline or table.
3. **Acceptance**: Coach can record a warning or adjustment against a claimant; it appears in history and can be used for reporting.

---

### 3.3 Coach report export (PDF)

**Problem**: Export is CSV only; spec wants PDF for printing.

**Steps**:
1. **Backend**: Extend `GET /api/staff/work-coach/reports/export` to accept `format=pdf`. Same data as CSV; render as PDF (library as in 1.5). Include claimant name, period, summary table, activity table.
2. **Frontend**: In ExportLogDialog (and claimant detail), add “Download PDF”. Call export with `format=pdf`; trigger download; toast on success/error.
3. **Acceptance**: Coach can download a PDF report for a claimant for the selected period.

---

## Phase 4: Reliability, security, and polish

### 4.1 Fix or replace POST /auth/register

**Problem**: Register returns 500 in some environments; seed script works.

**Steps**:
1. **Backend**: Reproduce 500 (run register with same payload as frontend/curl). Fix: ensure db path is correct when server runs from different cwd; handle duplicate email with 400; add logging. If register is dev-only, document “use seed script for demo” and optionally disable register in production via env flag.
2. **Acceptance**: Either register works for dev sign-up, or it is clearly dev-only and seed script is the supported way to create users.

---

### 4.2 Dedicated error pages (404, 403, 500)

**Problem**: Catch-all sends everything to login; no friendly 404/403/500.

**Steps**:
1. **Frontend**: Add routes: `/404`, `/403`, `/500` with simple pages (PageHeader + message + link home/login). In React Router, add a `Route path="*"` that renders NotFoundPage (404) instead of redirect to login when user is authenticated; redirect to login only when not authenticated. For 403, use ProtectedRoute to redirect to `/403` when role is wrong. For 500, use an error boundary that renders 500 page.
2. **Acceptance**: Unknown URLs show 404; forbidden access shows 403; uncaught errors show 500; all with consistent layout and navigation.

---

### 4.3 FastAPI deprecation and small backend cleanups

**Problem**: `Query(..., regex=...)` deprecation warning; other small tech debt.

**Steps**:
1. **Backend**: Replace `regex=` with `pattern=` in server.py. Grep for other deprecations; fix. Add any missing `response_model` or status codes for OpenAPI clarity.
2. **Acceptance**: No deprecation warnings on server start; OpenAPI docs accurate.

---

### 4.4 Multi-tenancy and scaling readiness

**Problem**: Single config.yaml and single-claimant assumption; need path to many claimants and coaches.

**Steps**:
1. **Backend**: Introduce explicit claimant identifier (e.g. user_id from auth) for all claimant-scoped data. Store config per claimant (e.g. `configs/{claimant_id}.yaml` or DB). Ensure logs, job queue, and evidence are keyed by claimant_id. Migrate existing single config to per-claimant if needed.
2. **Documentation**: Document data model (users, assignments, configs, logs) and deployment notes for “many claimants / many coaches”. No need to implement full scaling yet; structure and docs suffice for “production-ready” claim.
3. **Acceptance**: One config and one log set per claimant; assignment model supports many coaches and claimants.

---

### 4.5 Observability and production hygiene

**Problem**: Need production-grade logging, health, and optional monitoring.

**Steps**:
1. **Backend**: Structured logging (JSON or key-value) for request id, user id, endpoint, duration, status. Health endpoint already exists; ensure it checks DB and critical paths. Optionally add metrics (e.g. request count, error count by route) for Prometheus or similar.
2. **Frontend**: Ensure analytics events cover critical flows (login, onboarding complete, run started/completed, export). No PII in analytics. Optional: error boundary reports to backend or error tracking service.
3. **Acceptance**: Logs are parseable; health is reliable; critical actions are measurable without PII.

---

### 4.6 Security and deployment checklist

**Problem**: Production must be secure and deployable.

**Steps**:
1. **Secrets**: Session secret from env; no default in production. Document required env vars (e.g. `AUTOAPPLYER_SESSION_SECRET`, `DATABASE_URL` if you move off SQLite).
2. **HTTPS**: Document that production must run behind HTTPS; cookies marked secure.
3. **CORS**: If frontend is ever on different origin, configure CORS explicitly; do not use wildcard in production.
4. **Rate limiting**: Optional but recommended on auth and export endpoints to avoid abuse.
5. **Acceptance**: Deployment doc lists secrets, HTTPS, and optional CORS/rate limits; app runs without default secrets in prod.

---

## Phase 5: Optional / later

- **Pilot/control group**: Data model and UI to tag claimants as pilot vs control; filter in DWP dashboard.
- **Regions/jobcentres CRUD**: Admin page to manage regions and jobcentres instead of hardcoded list.
- **Advanced reports**: Admin reports page with custom date ranges, aggregates, export.
- **Real-time run status**: WebSockets or SSE for run progress (post-MVP).
- **Mobile polish**: Touch targets, responsive tables, and offline hints already partially there; audit and refine.

---

## Summary table (priority order)

| # | Item | Phase | Outcome |
|---|------|--------|---------|
| 1 | Settings real profile load/save | 1.1 | Claimant can edit and persist profile from Settings |
| 2 | Weekly requirement source of truth | 1.2 | Required applications configurable and consistent |
| 3 | Historical compliance (multi-week) | 1.3 | Past weeks visible on compliance/dashboard |
| 4 | Activity item detail view | 1.4 | Click row → details + artifact link |
| 5 | PDF export (claimant) | 1.5 | Download evidence as PDF |
| 6 | Onboarding “Skip for now” | 1.6 | Optional skip with clear limitation copy |
| 7 | Admin routes + placeholder pages | 2.1 | No broken admin sidebar links |
| 8 | User management (admin) | 2.2 | Create/edit users, assign claimants to coaches |
| 9 | Work coach assigned claimants filter | 2.3 | Coach sees only assigned claimants |
| 10 | System configuration (admin) | 2.4 | Admin can set defaults/regime levels |
| 11 | Audit log | 2.5 | All sensitive actions logged and viewable |
| 12 | Notes and flags (claimant detail) | 3.1 | Coach can add notes; flags shown |
| 13 | Compliance actions | 3.2 | Coach can log warnings/adjustments |
| 14 | Coach report PDF export | 3.3 | Coach can download PDF report |
| 15 | Fix /auth/register or document | 4.1 | Register works or seed-only is documented |
| 16 | 404 / 403 / 500 pages | 4.2 | Friendly error pages and error boundary |
| 17 | FastAPI deprecation + cleanups | 4.3 | No deprecation warnings |
| 18 | Multi-tenancy readiness | 4.4 | Per-claimant config and assignment model |
| 19 | Observability | 4.5 | Logging, health, analytics for production |
| 20 | Security and deployment checklist | 4.6 | Secrets, HTTPS, CORS, optional rate limits |

---

**Usage**: Work through phases in order; each step is implementable in a few hours to a day. Mark items done in this doc or in a tracker. After Phase 4, the app is production-ready for a pilot and investable from a product and platform perspective.
