#!/usr/bin/env bash
# On-prem offline-first installer. Run on target machine (Linux/macOS) with Docker.
# Copy dist-install/ to USB; copy to target; run ./install.sh. No network required if images are pre-loaded.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== That Agile App — On-Prem Install ==="

# 1) Verify Docker and Docker Compose
if ! command -v docker &>/dev/null; then
  echo "Error: Docker is not installed. Install Docker and try again."
  exit 1
fi
if ! docker compose version &>/dev/null && ! docker-compose version &>/dev/null; then
  echo "Error: Docker Compose is not available. Install Docker Compose and try again."
  exit 1
fi
COMPOSE_CMD="docker compose"
if ! docker compose version &>/dev/null; then
  COMPOSE_CMD="docker-compose"
fi
echo "Docker and Compose OK."

# 2) Copy .env from example if missing
if [ ! -f .env ]; then
  if [ -f .env.onprem.example ]; then
    cp .env.onprem.example .env
    echo "Created .env from .env.onprem.example — please edit .env with your settings."
  else
    echo "Error: .env not found and .env.onprem.example missing. Cannot continue."
    exit 1
  fi
else
  echo ".env found."
fi

# 3) Validate required env (ports, base URL, tenant id)
source .env 2>/dev/null || true
APP_PORT="${APP_PORT:-8080}"
if [ -z "$VITE_APP_BASE_URL" ]; then
  export VITE_APP_BASE_URL="http://localhost:${APP_PORT}"
  echo "Set VITE_APP_BASE_URL to $VITE_APP_BASE_URL (override in .env if needed)."
fi
echo "APP_PORT=$APP_PORT, VITE_APP_BASE_URL=$VITE_APP_BASE_URL"

# 4) Load pre-built images from tar if present (air-gapped)
if [ -d images ] && [ -n "$(ls -A images/*.tar 2>/dev/null)" ]; then
  echo "Loading images from images/*.tar..."
  for f in images/*.tar; do
    [ -f "$f" ] && docker load -i "$f" || true
  done
fi

# 5) Start services
echo "Starting services..."
$COMPOSE_CMD up -d

echo ""
echo "=== Install complete ==="
echo "App URL: http://localhost:${APP_PORT} (or your VITE_APP_BASE_URL)"
echo "Next: open in browser, sign in or register. For air-gapped, set AUTH_PROVIDER=local when supported."
echo "To stop: $COMPOSE_CMD down"
