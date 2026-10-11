#!/usr/bin/env bash
# First-time setup (and safe to re-run) for the wedding planner on rootless Podman 3.4+.
#   ./deploy/podman/run.sh
# Pulls the image, starts the container on 127.0.0.1, and installs a user systemd
# service so it restarts on failure and starts at boot (needs `loginctl enable-linger`).
#
# Environment overrides:
#   IMAGE      (default ghcr.io/sanfarish/wedding-planner:latest)
#   APP_HOME   (default ~/wedding: holds .env, data/ and backups/)
#   HOST_PORT  (default 3000: Nginx proxies to 127.0.0.1:HOST_PORT)
#   NAME       (default wedding)
set -euo pipefail

NAME="${NAME:-wedding}"
IMAGE="${IMAGE:-ghcr.io/sanfarish/wedding-planner:latest}"
APP_HOME="${APP_HOME:-$HOME/wedding}"
HOST_PORT="${HOST_PORT:-3000}"
UNIT="container-${NAME}.service"
UNIT_DIR="$HOME/.config/systemd/user"

die() { echo "Error: $*" >&2; exit 1; }

[ "$(id -u)" -ne 0 ] || die "run this as your normal user (rootless Podman), not root or sudo."
command -v podman >/dev/null || die "podman is not installed."
[ -f "$APP_HOME/.env" ] || die "create $APP_HOME/.env first (copy deploy/podman/wedding.env.example)."
grep -Eq '^SESSION_SECRET=.{32,}$' "$APP_HOME/.env" && ! grep -q '^SESSION_SECRET=replace-this' "$APP_HOME/.env" \
  || die "set SESSION_SECRET in $APP_HOME/.env to a random value of 32+ characters (openssl rand -base64 48)."

# Rootless podman/systemctl need this; it is missing when you switch users with su/sudo.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

mkdir -p "$APP_HOME/data" "$APP_HOME/backups" "$UNIT_DIR"
chmod 700 "$APP_HOME/data" "$APP_HOME/backups"
chmod 600 "$APP_HOME/.env"

echo "==> Pulling $IMAGE"
podman pull "$IMAGE"

echo "==> Replacing any existing '$NAME' container"
systemctl --user stop "$UNIT" 2>/dev/null || true
podman rm -f "$NAME" >/dev/null 2>&1 || true

# --userns=keep-id: files the app writes in data/ belong to you on the host.
# -p 127.0.0.1:...: reachable only from this machine (via Nginx), never from the internet.
podman run -d --name "$NAME" \
  --userns=keep-id \
  -p "127.0.0.1:${HOST_PORT}:3000" \
  -v "$APP_HOME/data:/app/server/data" \
  --env-file "$APP_HOME/.env" \
  --label io.containers.autoupdate=registry \
  "$IMAGE" >/dev/null

echo "==> Waiting for the app"
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null || { podman logs "$NAME" | tail -20; die "the app did not start."; }

echo "==> Installing systemd user service $UNIT"
(cd "$UNIT_DIR" && podman generate systemd --new --name "$NAME" --restart-policy=always --files >/dev/null)
podman rm -f "$NAME" >/dev/null   # systemd recreates it from the unit
systemctl --user daemon-reload
systemctl --user enable --now "$UNIT"

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null || die "service started but the app is not responding: journalctl --user -u $UNIT"

echo
echo "Running: http://127.0.0.1:${HOST_PORT} (service $UNIT)"
if ! loginctl show-user "$(id -un)" -p Linger 2>/dev/null | grep -q 'Linger=yes'; then
  echo "IMPORTANT: run once so it starts at boot without you logging in:"
  echo "  sudo loginctl enable-linger $(id -un)"
fi
echo "Create the two accounts (first time only):"
echo "  podman exec -it $NAME node server/dist/scripts/create-user.js"
