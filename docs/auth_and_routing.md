# Authentication and Routing Documentation

This document explains the multi-role authentication and routing system implemented in AutoApplyer.

## Overview

AutoApplyer now supports three user roles:
- **Claimant**: Job seekers using the application tool
- **Coach**: Work coaches managing claimants
- **Admin**: DWP administrators viewing regional metrics

All routes are protected by role-based access control (RBAC) on both the backend and frontend.

## Backend Authentication

### User Store

Users are stored in a SQLite database (`data/auth.db`). The auth store module (`autoapply/auth_store.py`) provides:

- User creation with password hashing (PBKDF2-HMAC-SHA256)
- User lookup by email or ID
- Password verification
- Role management

**User Model:**
- `id`: Unique identifier
- `email`: User email (unique)
- `password_hash`: Hashed password
- `role`: One of `"claimant"`, `"coach"`, or `"admin"`
- `display_name`: Optional display name

### Authentication Endpoints

#### `POST /auth/login`
Login endpoint that accepts email and password, returns a session cookie.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
- Sets HTTP-only cookie named `autoapply_session`
- Returns user object (excluding password)

#### `POST /auth/logout`
Clears the session cookie.

#### `POST /auth/register`
Development-only endpoint to create users. In production, this should be restricted or removed.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password",
  "role": "claimant",
  "display_name": "Optional Name"
}
```

#### `GET /auth/me`
Returns the current authenticated user's information.

### Session Management

Sessions use signed, HTTP-only cookies:
- Cookie name: `autoapply_session`
- Duration: 7 days
- Security: HTTP-only (prevents XSS), SameSite=Lax (CSRF protection)
- Signature: HMAC-SHA256

The session token contains:
- User ID
- Role
- Expiration timestamp

### Route Protection

Protected routes use FastAPI dependencies:

```python
from autoapply.auth import get_current_user, check_role

@app.get("/protected-route")
async def my_route(current_user: User = Depends(get_current_user)):
    check_role(current_user, ["claimant"])
    # Route logic here
```

**Protected Routes:**

| Route | Method | Required Role |
|-------|--------|---------------|
| `/setup` | GET, POST | `claimant` |
| `/run` | POST | `claimant` |
| `/status` | GET | `claimant` |
| `/api/claimant/status` | GET | `claimant` |
| `/api/staff/work-coach/claimants` | GET | `coach`, `admin` |
| `/api/staff/work-coach/claimants/{id}` | GET | `coach`, `admin` |
| `/api/staff/dwp/metrics` | GET | `admin`, `coach` |
| `/api/staff/regions` | GET | `admin`, `coach` |
| `/api/staff/jobcentres` | GET | `admin`, `coach` |

## Frontend Authentication

### Auth Context

The `AuthContext` (`src/contexts/AuthContext.tsx`) provides:
- `user`: Current user object or null
- `isLoading`: Authentication check in progress
- `login(email, password)`: Login function
- `logout()`: Logout function
- `checkAuth()`: Refresh authentication state

### API Client

The API client (`src/lib/apiClient.ts`) automatically includes cookies with all requests using `credentials: "include"`.

### Protected Routes

React Router routes are protected using the `ProtectedRoute` component:

```tsx
<ProtectedRoute allowedRoles={["claimant"]}>
  <ClaimantAppShell>
    <ClaimantDashboard />
  </ClaimantAppShell>
</ProtectedRoute>
```

If a user without the required role tries to access a route, they are redirected to their role's default dashboard.

## Route Map

### Claimant Routes (`/app/*`)

- `/app/dashboard` - Main claimant dashboard
- `/app/applications` - Application history (placeholder)
- `/app/settings` - Settings page (placeholder)

**Layout:** `ClaimantAppShell` with sidebar navigation

### Staff Routes (`/staff/*`)

- `/staff/work-coach` - Work coach dashboard (coach, admin)
- `/staff/dwp` - DWP admin dashboard (admin only)

**Layouts:** `CoachAppShell` or `AdminAppShell`

### Public Routes

- `/login` - Shared login page for all roles
- `/` - Landing page (redirects to `/login`)

## Creating Users

### Development Seeding

To create users for development/testing:

**Option 1: Using the API**

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "claimant@example.com",
    "password": "password",
    "role": "claimant",
    "display_name": "Test Claimant"
  }'
```

**Option 2: Python Script**

Create a simple script to seed users:

```python
from autoapply.auth_store import get_auth_store

store = get_auth_store()

# Create test users
store.create_user("claimant@example.com", "password", "claimant", "Test Claimant")
store.create_user("coach@example.com", "password", "coach", "Test Coach")
store.create_user("admin@example.com", "password", "admin", "Test Admin")
```

### Production

In production:
1. Remove or restrict the `/auth/register` endpoint
2. Use a proper user management system
3. Set `AUTOAPPLYER_SESSION_SECRET` environment variable for secure session signing
4. Use HTTPS and set `secure=True` on session cookies

## Adjusting Role Checks

### Backend

Role checks are in `autoapply/server.py`:

```python
# Example: Restrict a route to admin only
check_role(current_user, ["admin"])

# Example: Allow multiple roles
check_role(current_user, ["coach", "admin"])
```

### Frontend

Role checks are in route definitions in `src/App.tsx`:

```tsx
<ProtectedRoute allowedRoles={["admin"]}>
  {/* Route content */}
</ProtectedRoute>
```

## Session Secret Key

The session secret key is used to sign session cookies. By default, it uses a hardcoded value (insecure for production).

**For Production:**

Set the `AUTOAPPLYER_SESSION_SECRET` environment variable:

```bash
export AUTOAPPLYER_SESSION_SECRET="your-random-secret-key-here"
```

Generate a secure secret:

```python
import secrets
print(secrets.token_urlsafe(32))
```

## Building and Serving the React App

1. Build the React app:
   ```bash
   npm run build
   ```

2. The server automatically serves the React app for:
   - `/app/*` routes (claimant)
   - `/staff/*` routes (staff)

3. The built app is in `dist/` directory

## Troubleshooting

### "User not found" error after login
- Check that the user exists in the database
- Verify the database file exists at `data/auth.db`

### "Invalid or expired session"
- Session may have expired (7 days)
- Clear cookies and log in again
- Check that session secret hasn't changed

### React routes return 404
- Ensure you've built the React app: `npm run build`
- Check that `dist/index.html` exists
- Verify server routes are correctly configured

### CORS or cookie issues
- Ensure API requests use `credentials: "include"`
- Check that frontend and backend are on the same origin (or configure CORS)

## Security Considerations

1. **Password Storage**: Uses PBKDF2-HMAC-SHA256 with 100,000 iterations
2. **Session Cookies**: HTTP-only, signed with HMAC
3. **Role-Based Access**: Enforced on both backend and frontend
4. **Production Settings**: Must set session secret via environment variable and use HTTPS

## Future Enhancements

- Password reset functionality
- Email verification
- Two-factor authentication
- Session management UI for admins
- Audit logging of authentication events
- Rate limiting on login attempts

