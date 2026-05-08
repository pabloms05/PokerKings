#!/bin/sh
set -e

start_frontend_watch() {
  echo "[app] FRONTEND_WATCH=true -> iniciando vite build --watch"
  export VITE_BUILD_OUTDIR="${VITE_BUILD_OUTDIR:-/app/public}"
  export VITE_API_URL="${VITE_API_URL:-/api}"
  export VITE_SOCKET_URL="${VITE_SOCKET_URL:-/}"
  export CHOKIDAR_USEPOLLING="${CHOKIDAR_USEPOLLING:-true}"

  cd /frontend
  if [ ! -x ./node_modules/.bin/vite ]; then
    echo "[app] Instalando dependencias del frontend (primera ejecucion)..."
    npm ci
  fi
  node /frontend/node_modules/vite/bin/vite.js build --watch &
  FRONTEND_WATCH_PID=$!
  cd /app
}

cleanup() {
  if [ -n "${FRONTEND_WATCH_PID:-}" ] && kill -0 "$FRONTEND_WATCH_PID" 2>/dev/null; then
    kill "$FRONTEND_WATCH_PID" 2>/dev/null || true
  fi
}

start_backend() {
  if [ "${BACKEND_WATCH:-false}" = "true" ]; then
    echo "[app] BACKEND_WATCH=true -> iniciando node --watch"
    exec node --watch src/server.js
  fi

  exec npm start
}

if [ "${FRONTEND_WATCH:-false}" = "true" ]; then
  start_frontend_watch
  trap cleanup INT TERM EXIT
fi

start_backend
