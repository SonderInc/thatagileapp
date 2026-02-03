#!/usr/bin/env bash
# Load Docker images from tar files (e.g. from USB). Run before install.sh on air-gapped targets.
# On build host: docker save -o images/app.tar <image>  (see README_INSTALL.md)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
IMAGES_DIR="${1:-images}"

if [ ! -d "$IMAGES_DIR" ]; then
  echo "Usage: $0 [images-dir]"
  echo "Default images dir: images/"
  echo "Place *.tar files from 'docker save' there, then run this script."
  exit 1
fi

echo "Loading Docker images from $IMAGES_DIR..."
for f in "$IMAGES_DIR"/*.tar; do
  if [ -f "$f" ]; then
    echo "Loading $f..."
    docker load -i "$f"
  fi
done
echo "Done. Run ./install.sh to start services."
