# Multi-stage: build Vite SPA, then run FastAPI + static dist (single-origin deploy).
# Free hosts: Render (Web Service), Fly.io, Railway (credit-based), etc.

FROM node:20-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts tailwind.config.js postcss.config.js index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM python:3.11-slim-bookworm
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml alembic.ini ./
COPY autoapply ./autoapply
COPY alembic ./alembic
COPY adapters ./adapters
COPY core ./core
COPY ui ./ui
COPY scripts ./scripts
COPY public ./public
COPY seed_users.py run.py config.example.yaml ./
COPY --from=frontend /build/dist ./dist
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -e .
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn autoapply.server:app --host 0.0.0.0 --port ${PORT}"]
