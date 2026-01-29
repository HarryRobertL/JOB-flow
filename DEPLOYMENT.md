# AutoApplyer AI - Deployment Guide

**Version**: 1.0  
**Date**: 2025-01-15  
**Purpose**: Guide for deploying AutoApplyer AI in development and pilot environments

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Production Build](#production-build)
3. [Deploy to Railway](#deploy-to-railway)
4. [Running Tests](#running-tests)
5. [Headless Deployment](#headless-deployment)
6. [Environment Variables](#environment-variables)
7. [File System Expectations](#file-system-expectations)
8. [Health Checks and Monitoring](#health-checks-and-monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- Python 3.10 or higher
- Node.js 18+ and npm
- Playwright browsers installed (run `playwright install` after installing Python dependencies)

### Step 1: Install Python Dependencies

```bash
# Install the package in development mode
pip install -e .

# Or install dependencies directly
pip install -r requirements.txt  # If you have one, or install from pyproject.toml
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

### Step 3: Install Playwright Browsers

```bash
playwright install chromium
```

### Step 4: Create Configuration

```bash
# Copy the example config
cp config.example.yaml config.yaml

# Edit config.yaml with your settings
# See config.example.yaml for detailed comments
```

### Step 5: Seed Demo Users

```bash
# Create test users (claimant, coach, admin)
python seed_users.py
```

**User registration**: The `POST /auth/register` endpoint is intended for development and demo only. In production, create users via the seed script or admin user management. Duplicate email returns 400; database errors (e.g. missing write access to `data/`) return 500 with a clear message. For demo users, always use the seed script.

### Step 6: Build Frontend (Development)

For development, you can run the frontend in dev mode separately:

```bash
# Terminal 1: Frontend dev server
npm run dev

# Terminal 2: Backend server
python -m autoapply.server
```

Or build once and serve from FastAPI:

```bash
# Build React app
npm run build

# Start server (serves built React app from dist/)
python -m autoapply.server
```

### Step 7: Access the Application

- **Landing Page**: http://localhost:8000/
- **Login**: http://localhost:8000/login
- **Claimant Dashboard**: http://localhost:8000/app/dashboard
- **Work Coach Dashboard**: http://localhost:8000/staff/work-coach
- **DWP Dashboard**: http://localhost:8000/staff/dwp

**Default Test Users** (from `seed_users.py`):
- Claimant: `claimant@example.com` / `password`
- Coach: `coach@example.com` / `password`
- Admin: `admin@example.com` / `password`

---

## Production Build

### Step 1: Build React Frontend

```bash
# Build for production (creates dist/ folder)
npm run build

# Verify dist/index.html exists
ls -la dist/index.html
```

### Step 2: Configure Backend

```bash
# Copy and customize config
cp config.example.yaml config.yaml
# Edit config.yaml with production settings
```

### Step 3: Start Production Server

```bash
# Using uvicorn directly
uvicorn autoapply.server:app --host 0.0.0.0 --port 8000

# Or using the CLI command
autoapply-ui

# Or using Python module
python -m autoapply.server
```

### Step 4: Serve with Production WSGI Server (Recommended)

For production, use a production ASGI server like Gunicorn with Uvicorn workers:

```bash
# Install gunicorn
pip install gunicorn

# Run with uvicorn workers
gunicorn autoapply.server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

### Step 5: Reverse Proxy (Nginx Example)

```nginx
server {
    listen 80;
    server_name autoapplyer.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }
}
```

---

## Deploy to Railway

Railway runs your app in the cloud and assigns a public URL. The app binds to `0.0.0.0` and uses the `PORT` environment variable when set.

### Prerequisites

- A [Railway](https://railway.app) account
- Your AutoApplyer repo pushed to GitHub (or connected to Railway via GitHub)

### Step 1: Create a new project and service

1. In Railway, click **New Project**.
2. Choose **Deploy from GitHub repo** and select your AutoApplyer repository.
3. Ensure the **Root Directory** is the repo root (where `autoapply/`, `package.json`, and `pyproject.toml` live). Leave blank if the repo root is the project root.

### Step 2: Configure build and start

A `nixpacks.toml` in the repo root tells Railway to use both Python and Node, and sets the build and start commands. If you prefer to set them in the Railway UI:

| Setting | Value |
|--------|--------|
| **Build Command** | `pip install -e . && npm ci && npm run build` |
| **Start Command** | `uvicorn autoapply.server:app --host 0.0.0.0 --port $PORT` |
| **Watch Paths** | (optional) Leave default so pushes to main trigger deploys. |

- **Build**: Installs the Python package (including Playwright deps), installs Node dependencies with `npm ci`, and builds the React frontend into `dist/`.
- **Start**: Runs the FastAPI app bound to all interfaces on Railway’s `PORT`. You can also use `python -m autoapply.server`; the server uses `0.0.0.0` and `$PORT` when `PORT` is set.

### Step 3: Set environment variables

In the service **Variables** tab, add:

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTOAPPLYER_SESSION_SECRET` | Yes | Long random string for signing cookies. Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `AUTOAPPLYER_SECURE_COOKIES` | Recommended | Set to `true` for production (HTTPS). |
| `DATABASE_URL` | Optional | PostgreSQL connection string if you add a Railway Postgres plugin. If unset, the app uses SQLite in `data/` (see persistence below). |
| `OBJECT_STORE_BUCKET` | Optional | S3-compatible bucket for artifacts/exports. |
| `OBJECT_STORE_REGION` | Optional | Region for object storage (e.g. `eu-west-2`). |

### Step 4: Persistence (data and profiles)

- **SQLite and file-based data**: By default the app uses the `data/` directory under the project root (e.g. `data/auth.db`). On Railway, the filesystem is ephemeral unless you attach a **volume**.
- **Recommended for demo/pilot**: In Railway, add a **Volume** and set its **Mount Path** to `data` (so the volume is mounted at `<project_root>/data`). The app writes auth DB, logs, and run state to `data/`; with the volume mounted, these persist across deploys.
- **Browser profiles**: Playwright profiles live under `profiles/`. For persistent sessions across restarts, you can add a second volume with mount path `profiles`; otherwise sessions may be lost on redeploy.

### Step 5: Deploy and open the app

1. Trigger a deploy (push to the connected branch or click **Deploy**).
2. After the build succeeds, open the **Public URL** (e.g. from the **Settings** → **Networking** → **Generate domain**).
3. Visit `/health` to confirm the app is up; then use `/login` and the seed users to test.

### Step 6: Seed demo users (first deploy)

If you use SQLite and a persistent volume (or ephemeral data for a quick demo), run the seed script once so demo users exist:

- Use Railway’s **Shell** (or a one-off run) from the project root:
  ```bash
  python seed_users.py
  ```
- Default test users: claimant `claimant@example.com` / `password`, coach `coach@example.com` / `password`, admin `admin@example.com` / `password`.

### Optional: Postgres and migrations

If you add a Postgres database in Railway and set `DATABASE_URL`:

1. Run migrations in a one-off command or in the build:
   ```bash
  alembic upgrade head
   ```
2. Then start the app with the same start command above. Seed users and any DB-backed data will use Postgres.

### Railway checklist

- [ ] Root directory = repo root (or correct subdirectory).
- [ ] Build command = `pip install -e . && npm ci && npm run build`.
- [ ] Start command = `uvicorn autoapply.server:app --host 0.0.0.0 --port $PORT`.
- [ ] `AUTOAPPLYER_SESSION_SECRET` set; `AUTOAPPLYER_SECURE_COOKIES=true` for production.
- [ ] Volume mounted for `data/` (and optionally `profiles/`) if you need persistence.
- [ ] `python seed_users.py` run after first deploy (and after `alembic upgrade head` if using Postgres).

---

## Running Tests

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=autoapply --cov-report=html

# Run specific test file
pytest tests/test_api_endpoints.py

# Run with verbose output
pytest -v
```

### Frontend Tests

```bash
# If you have frontend tests set up
npm test
```

### Test Health Endpoint

```bash
# Check health endpoint
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "version": "0.1.0",
#   "timestamp": "2025-01-15T10:30:00.000Z",
#   "paths": {...},
#   "database": {"status": "connected"}
# }
```

---

## Headless Deployment

### Option 1: Systemd Service (Linux)

Create `/etc/systemd/system/autoapplyer.service`:

```ini
[Unit]
Description=AutoApplyer AI Server
After=network.target

[Service]
Type=simple
User=autoapplyer
WorkingDirectory=/opt/autoapplyer
Environment="PATH=/opt/autoapplyer/venv/bin"
ExecStart=/opt/autoapplyer/venv/bin/gunicorn autoapply.server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 127.0.0.1:8000 \
  --timeout 120
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable autoapplyer
sudo systemctl start autoapplyer
sudo systemctl status autoapplyer
```

### Option 2: Docker (If Dockerfile Exists)

```bash
# Build image
docker build -t autoapplyer:latest .

# Run container
docker run -d \
  --name autoapplyer \
  -p 8000:8000 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/profiles:/app/profiles \
  -e AUTOAPPLYER_SESSION_SECRET=your-secret-key \
  autoapplyer:latest
```

### Option 3: PM2 (Node.js Process Manager)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file: ecosystem.config.js
module.exports = {
  apps: [{
    name: 'autoapplyer',
    script: 'python',
    args: '-m autoapply.server',
    interpreter: 'none',
    env: {
      AUTOAPPLYER_SESSION_SECRET: 'your-secret-key',
    },
  }],
};

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Environment Variables

### Required for Production

```bash
# Session secret for signing cookies (generate a secure random string)
export AUTOAPPLYER_SESSION_SECRET="your-secure-random-secret-key-here"

# Optional: Override default paths
export AUTOAPPLYER_DATA_DIR="/var/lib/autoapplyer/data"
export AUTOAPPLYER_CONFIG_PATH="/etc/autoapplyer/config.yaml"
export AUTOAPPLYER_LOGS_PATH="/var/log/autoapplyer/logs.csv"
```

### Generating Session Secret

```bash
# Generate a secure random secret
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Pilot Environment Variables

For a pilot deployment with 5,000 claimants, consider:

```bash
# Database (if migrating from SQLite to PostgreSQL)
export DATABASE_URL="postgresql://user:pass@localhost/autoapplyer"

# Redis (if adding job queue)
export REDIS_URL="redis://localhost:6379/0"

# Logging
export LOG_LEVEL="INFO"
export LOG_FILE="/var/log/autoapplyer/app.log"

# Analytics
export ANALYTICS_ENABLED="true"
export ANALYTICS_ENDPOINT="https://analytics.example.com/api/events"
```

### SaaS multi-tenant (Phase 6–7)

When running with Postgres and object storage:

```bash
# Postgres (required for tenant isolation and queue)
export DATABASE_URL="postgresql://user:pass@host:5432/autoapplyer"

# Object storage for artifacts/exports (optional; requires boto3 and OBJECT_STORE_BUCKET)
export OBJECT_STORE_BUCKET="your-bucket"
export OBJECT_STORE_REGION="eu-west-2"

# Secure cookies in production (HTTPS)
export AUTOAPPLYER_SECURE_COOKIES="true"
```

**Rate limiting and observability**: In production, use a reverse proxy (e.g. nginx, CloudFront) for rate limiting on auth, export, and run endpoints. Structured logs already include `request_id`, `method`, `path`, `status_code`, and `duration_ms`; add `tenant_id`/`user_id` in app logs when available for observability.

---

## Data model and multi-tenancy readiness

The application supports **many claimants and many coaches** with the following model:

- **Users** (`data/auth.db`): SQLite table of users (id, email, role, display_name). Roles: claimant, coach, admin.
- **Assignments** (`data/auth.db`, table `user_assignments`): Coach–claimant assignments. Each coach has a list of assigned claimant IDs; work-coach APIs filter by assignment; admin sees all.
- **Claimant-scoped data**: Notes (`claimant_notes.jsonl`), compliance actions (`compliance_actions.jsonl`), and evidence (`evidence.csv`) are keyed by `claimant_id` (user id). One logical set per claimant.
- **Logs** (`data/logs.csv`): Activity log; in the current pilot layout entries may include claimant context. For full multi-tenant scaling, consider per-claimant log files or a database with a claimant_id column.
- **Config**: A single `config.yaml` is used for the primary claimant; system-wide defaults live in `data/system_settings.json`. For strict multi-tenancy, introduce per-claimant config (e.g. `configs/{claimant_id}.yaml` or DB) and key all reads by authenticated claimant.

**Deployment for many claimants / many coaches**: Ensure the server has write access to `data/`. Create users via the seed script or admin user management; assign claimants to coaches in Admin → Users. All claimant-scoped APIs use the authenticated user id or the requested claimant id (with assignment check for coaches).

---

## File System Expectations

### Directory Structure

```
autoapply/
├── data/                    # Data directory (created automatically)
│   ├── auth.db              # SQLite: users, user_assignments, claimant_skip
│   ├── system_settings.json # Default compliance settings (admin)
│   ├── audit.jsonl          # Audit log (admin actions, exports)
│   ├── claimant_notes.jsonl # Coach notes per claimant
│   ├── compliance_actions.jsonl # Warnings/adjustments per claimant
│   ├── logs.csv             # Application activity log (append-only)
│   ├── evidence.csv         # Evidence log (claimant_id in rows)
│   ├── analytics.jsonl     # Frontend analytics events (JSONL)
│   ├── jobs_queue.json      # Discovered jobs awaiting review
│   └── artifacts/           # Screenshots and debugging artifacts
│       └── {timestamp}/     # Timestamped artifact directories
├── profiles/                # Playwright browser profiles
│   └── default/             # Default browser profile (persists cookies)
├── config.yaml              # Main configuration file
└── dist/                    # Built React frontend (from npm run build)
```

### File Permissions

```bash
# Ensure data directory is writable
chmod 755 data/
chmod 644 data/*.csv data/*.json data/*.jsonl

# Ensure profiles directory is writable (for browser cookies)
chmod 755 profiles/
chmod -R 755 profiles/default/

# Config file should be readable
chmod 644 config.yaml
```

### Log Retention

- **Application Logs** (`data/logs.csv`): Retain for at least 6 months for audit
- **Evidence Logs** (`data/evidence.csv`): Retain for at least 6 months for compliance
- **Analytics Logs** (`data/analytics.jsonl`): Retain for pilot analysis period
- **Artifacts** (`data/artifacts/`): Can be cleaned up after 30 days (debugging only)

### Disk Space Requirements

For a pilot with 5,000 claimants:
- **Logs**: ~100MB per month (CSV format)
- **Artifacts**: ~500MB per month (screenshots, HTML snapshots)
- **Database**: ~50MB (SQLite, scales with user count)
- **Browser Profiles**: ~200MB per profile (one per installation)

**Total**: ~1GB per month for logs and artifacts. Plan for 6 months retention = ~6GB.

---

## Health Checks and Monitoring

### Health Endpoint

```bash
# Check application health
curl http://localhost:8000/health

# Expected response (200 OK):
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "paths": {
    "data_dir": {"exists": true, "writable": true},
    "logs_path": {"exists": true, "writable": true},
    "config_path": {"exists": true, "writable": false}
  },
  "database": {"status": "connected"}
}
```

### Monitoring Integration

Use the health endpoint with monitoring tools:

- **Prometheus**: Scrape `/health` endpoint
- **Nagios/Icinga**: HTTP check on `/health`
- **Load Balancer**: Health check endpoint
- **Kubernetes**: Liveness/readiness probe

Example Kubernetes probe:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Observability

- **Structured request logging**: Each HTTP request is logged with `request_id`, `method`, `path`, `status_code`, and `duration_ms`. No PII (no user id or email in logs). Pass `X-Request-ID` in requests to correlate with your own IDs.
- **Health**: `GET /health` returns application status, path checks, engine prerequisites (config, data writable, profiles, Playwright), and database connectivity. Use for liveness/readiness and load balancers.
- **Frontend analytics**: Critical flows (login, onboarding complete, run started/completed, export) are tracked via `src/lib/analytics.ts`; events are sent to the backend or console. No PII in analytics (see `docs/analytics_events.md`).

---

## Security and deployment checklist

Before production:

1. **Secrets**: Set `AUTOAPPLYER_SESSION_SECRET` from environment; do not use a default in production. Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`.
2. **HTTPS**: Run the app behind HTTPS (e.g. Nginx or a cloud load balancer). Session cookies should be marked `secure` in production (configure in auth module if needed).
3. **CORS**: If the frontend is on a different origin, configure CORS explicitly in FastAPI; do not use wildcard `*` in production.
4. **Rate limiting**: Optional but recommended on `/auth/login` and export endpoints to reduce abuse. Add middleware or use a reverse proxy (e.g. Nginx `limit_req`).
5. **Data directory**: Ensure `data/` is writable only by the app user; protect `auth.db` and JSONL/CSV files from other users.
6. **Register endpoint**: `POST /auth/register` is for development/demo; use the seed script or admin user management for production users.

---

## Troubleshooting

### Server Won't Start

1. **Check Python version**: `python --version` (must be 3.10+)
2. **Check dependencies**: `pip list | grep fastapi`
3. **Check port availability**: `lsof -i :8000`
4. **Check logs**: Look for error messages in terminal output

### Frontend Not Loading

1. **Build React app**: `npm run build`
2. **Check dist/ folder exists**: `ls -la dist/index.html`
3. **Check server is serving static files**: Look for `serve_react_app()` in server.py
4. **Check browser console**: Look for 404 errors or CORS issues

### Authentication Issues

1. **Check session secret**: Ensure `AUTOAPPLYER_SESSION_SECRET` is set
2. **Check database**: `ls -la data/auth.db`
3. **Check users exist**: Run `python seed_users.py`
4. **Check cookies**: Ensure browser allows cookies for the domain

### Playwright Browser Issues

1. **Install browsers**: `playwright install chromium`
2. **Check profile directory**: `ls -la profiles/default/`
3. **Check permissions**: Ensure profiles directory is writable
4. **Check headless mode**: Set `headless=True` in automation calls

### Log Files Not Writing

1. **Check data directory exists**: `mkdir -p data`
2. **Check permissions**: `chmod 755 data/`
3. **Check disk space**: `df -h`
4. **Check file paths**: Verify `LOGS_PATH` in server.py

### Performance Issues

1. **Check database**: SQLite may need migration to PostgreSQL for concurrent writes
2. **Check logs size**: Large CSV files may slow down reads
3. **Check browser profiles**: Multiple profiles can consume memory
4. **Check automation rate**: Reduce `daily_apply_cap` in config.yaml

---

## Next Steps

After deployment:

1. **Seed test users**: Run `python seed_users.py` to create demo users (claimant, coach, admin)
2. **Seed demo data** (optional): Run `python scripts/seed_demo_data.py` to populate job queue and logs for instant demo
3. **Configure monitoring**: Set up health check alerts using `/health` endpoint
4. **Set up backups**: Backup `data/auth.db` and `data/logs.csv` regularly
5. **Review logs**: Monitor `data/logs.csv` for errors
6. **Test automation**: Run a test automation cycle to verify end-to-end flow
7. **Verify analytics**: Check that analytics events are being logged to `data/analytics.jsonl`

---

**End of Deployment Guide**

