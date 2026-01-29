#!/usr/bin/env sh
# Run backend and frontend for local development.
# Backend: http://127.0.0.1:8000  Frontend: http://localhost:5173
# Stop with Ctrl+C; backend will be stopped when you exit.

cd "$(dirname "$0")/.." || exit 1

python -m autoapply.server &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null' EXIT

npm run dev
