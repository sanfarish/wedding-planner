#!/usr/bin/env bash
# Updates the running container to the newest image.
#   ./deploy/podman/update.sh
# Backs up the database, pulls the image, and restarts the systemd service
# (the `--new` unit recreates the container from the new image; migrations run on start).
set -euo pipefail

NAME="${NAME:-wedding}"
IMAGE="${IMAGE:-ghcr.io/sanfarish/wedding-planner:latest}"
APP_HOME="${APP_HOME:-$HOME/wedding}"
HOST_PORT="${HOST_PORT:-3000}"
UNIT="container-${NAME}.service"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

echo "==> Backing up the database"
CONTAINER="$NAME" DATA_DIR="$APP_HOME/data" BACKUP_DIR="${BACKUP_DIR:-$APP_HOME/backups}" \
  "$REPO_DIR/scripts/backup-db.sh"

echo "==> Pulling $IMAGE"
podman pull "$IMAGE"

echo "==> Restarting $UNIT"
systemctl --user restart "$UNIT"

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null 2>&1; then
    echo "Updated and healthy."
    podman image prune -f >/dev/null || true
    exit 0
  fi
  sleep 1
done

echo "The app is not responding after the update. Recent logs:" >&2
journalctl --user -u "$UNIT" -n 30 --no-pager >&2 || true
exit 1
