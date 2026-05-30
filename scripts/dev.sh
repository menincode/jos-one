#!/usr/bin/env bash
# Start Vite dev server, wait for port, then pywebview (APP_ENV=development).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export APP_ENV=development

uv_cmd() {
  if command -v uv >/dev/null 2>&1; then
    uv "$@"
    return
  fi
  echo "uv is not installed. Install: https://docs.astral.sh/uv/getting-started/installation/" >&2
  echo "  curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
}

VITE_PID=""
cleanup() {
  if [[ -n "${VITE_PID}" ]] && kill -0 "${VITE_PID}" 2>/dev/null; then
    kill "${VITE_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if command -v yarn >/dev/null 2>&1; then
  yarn --cwd frontend dev &
else
  npm exec --yes yarn -- --cwd frontend dev &
fi
VITE_PID=$!

if [[ -f scripts/wait-port.ps1 ]] && command -v pwsh >/dev/null 2>&1; then
  pwsh -File scripts/wait-port.ps1 -Port 5173
elif command -v nc >/dev/null 2>&1; then
  for _ in $(seq 1 120); do
    nc -z 127.0.0.1 5173 && break
    sleep 0.5
  done
else
  sleep 3
fi

uv_cmd run python -m python.main
