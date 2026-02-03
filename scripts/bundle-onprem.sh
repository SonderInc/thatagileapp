#!/usr/bin/env bash
# Produces dist-install/ for USB/offline on-prem install. No UI change; packaging only.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== bundle:onprem ==="
# 1) Build frontend with on-prem defaults (no runtime download; env baked at build time)
export VITE_DEPLOYMENT_MODE=onprem
export VITE_APP_BASE_URL="${VITE_APP_BASE_URL:-http://localhost:8080}"
npm run build

# 2) Prepare dist-install
rm -rf dist-install
mkdir -p dist-install/app
mkdir -p dist-install/images
mkdir -p dist-install/api
mkdir -p dist-install/migrations
mkdir -p dist-install/licenses

# 3) Copy install files
cp install/docker-compose.yml dist-install/
cp install/nginx.conf dist-install/
cp install/.env.onprem.example dist-install/
cp install/install.sh dist-install/
cp install/load-images.sh dist-install/
cp install/README_INSTALL.md dist-install/
[ -d install/images ] && cp -r install/images/* dist-install/images/ 2>/dev/null || true
[ -d install/api ]    && cp -r install/api/* dist-install/api/ 2>/dev/null || true
[ -d install/migrations ] && cp -r install/migrations/* dist-install/migrations/ 2>/dev/null || true
[ -d install/licenses ]   && cp -r install/licenses/* dist-install/licenses/ 2>/dev/null || true

# 4) Copy built frontend into app/
cp -r dist/* dist-install/app/

chmod +x dist-install/install.sh dist-install/load-images.sh

echo "Done. dist-install/ is ready to copy to USB."
echo "Optional: export Docker images for air-gapped:"
echo "  docker save -o dist-install/images/nginx.tar nginx:alpine"
echo "  docker save -o dist-install/images/busybox.tar busybox:1.36"
