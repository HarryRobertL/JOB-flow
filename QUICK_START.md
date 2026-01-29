# Quick Start Guide

## Issues Fixed

1. ✅ **API Client** - Fixed to handle relative paths correctly
2. ✅ **Landing Page** - Created React landing page component
3. ✅ **Login Page** - Improved styling to match design system
4. ✅ **Routing** - Server now serves React app for `/`, `/login`, `/app/*`, `/staff/*`

## Run locally (development)

Use two terminals so the backend and frontend run together:

**Terminal 1 – Backend (FastAPI)**  
From the repo root (with venv activated if you use one):

```bash
python -m autoapply.server
```

Backend will be at http://127.0.0.1:8000.

**Terminal 2 – Frontend (Vite)**  
From the repo root:

```bash
npm run dev
```

Frontend will be at http://localhost:5173. Use this URL in the browser; Vite proxies `/auth` and `/api` to the backend.

Optional: run both with one command (backend in background):

```bash
./scripts/run-local.sh
```

Stop with Ctrl+C; the script will stop the backend when you exit.

---

## To Get Started (production-style: single server)

### 1. Build the React App

First, you need to build the React app:

```bash
npm run build
```

This creates the `dist/` folder with the built React app.

### 2. Create Test Users

Create test users by calling the registration endpoint:

```bash
# Create a claimant user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "claimant@example.com", "password": "password", "role": "claimant", "display_name": "Test Claimant"}'

# Create a coach user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "coach@example.com", "password": "password", "role": "coach", "display_name": "Test Coach"}'

# Create an admin user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password", "role": "admin", "display_name": "Test Admin"}'
```

Or create a Python script:

```python
from autoapply.auth_store import get_auth_store

store = get_auth_store()
store.create_user("claimant@example.com", "password", "claimant", "Test Claimant")
store.create_user("coach@example.com", "password", "coach", "Test Coach")
store.create_user("admin@example.com", "password", "admin", "Test Admin")
print("Users created!")
```

### 3. Start the Server

```bash
python -m autoapply.server
```

Or use the command:

```bash
autoapply-ui
```

### 4. Access the App

- **Landing Page**: http://localhost:8000/
- **Login Page**: http://localhost:8000/login
- **Claimant Dashboard**: http://localhost:8000/app/dashboard (after login as claimant)
- **Work Coach Dashboard**: http://localhost:8000/staff/work-coach (after login as coach)
- **DWP Dashboard**: http://localhost:8000/staff/dwp (after login as admin)

## Troubleshooting

### "Not Found" Error on Login

If you see "Not Found" when trying to login:

1. **Check if React app is built**: Run `npm run build` first
2. **Check if users exist**: The login will fail if users don't exist in the database
3. **Check browser console**: Look for API errors
4. **Check server logs**: The FastAPI server will show any errors

### React Routes Not Working

If React routes return 404:

1. Make sure you've run `npm run build`
2. Check that `dist/index.html` exists
3. Restart the server after building

### API Calls Failing

If API calls are failing:

1. Check browser console for CORS errors
2. Verify you're accessing the app from `http://localhost:8000`
3. Check that cookies are enabled in your browser
4. Look at Network tab to see the actual API requests/responses

## What's Working

✅ Authentication system with role-based access  
✅ Login/logout with session cookies  
✅ Landing page  
✅ Login page with proper styling  
✅ Routing for all user roles  
✅ Protected routes (frontend and backend)  
✅ Role-specific dashboards  

## Still TODO

- Wire up dashboards to fetch real data (they have placeholder data)
- Create ApplicationHistoryPage content
- Create SettingsPage content
- Add more error handling

