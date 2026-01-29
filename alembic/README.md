# Alembic migrations (SaaS foundation)

This repo supports running database migrations when `DATABASE_URL` is set.

## Quick start

1. Install Python dependencies (editable install from repo root):

```bash
pip install -e .
```

2. Set `DATABASE_URL` (example Postgres URL):

```bash
export DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/autoapply"
```

3. Run migrations:

```bash
alembic -c alembic.ini upgrade head
```

