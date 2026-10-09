#!/usr/bin/env bash
# Backs up the SQLite database using SQLite's online backup API, keeps
# daily/weekly/monthly copies, and optionally syncs them to remote storage.
#
# Usage (from cron):  /var/www/wedding.sanfarish.com/scripts/backup-db.sh
#
# Environment:
#   BACKUP_DIR      where backups are kept          (default: /backups/wedding)
#   RCLONE_REMOTE   e.g. "gdrive:wedding-backups"   (optional; requires rclone)
#   KEEP_DAILY / KEEP_WEEKLY / KEEP_MONTHLY          (default: 14 / 8 / 12)
set -euo pipefail
umask 077

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backups/wedding}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"
KEEP_MONTHLY="${KEEP_MONTHLY:-12}"

STAMP="$(date +%Y%m%d-%H%M%S)"
NAME="wedding-${STAMP}.db"

mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}
TMP="$BACKUP_DIR/.tmp-${NAME}"
trap 'rm -f "$TMP" "$TMP.gz"' EXIT

# 1. Consistent snapshot + integrity check (server/dist/scripts/backup.js)
cd "$APP_DIR"
node server/dist/scripts/backup.js "$TMP" >/dev/null
gzip -9 "$TMP"
mv "$TMP.gz" "$BACKUP_DIR/daily/${NAME}.gz"

# 2. Weekly copy on Sundays, monthly copy on the 1st
if [ "$(date +%u)" = "7" ]; then
  cp "$BACKUP_DIR/daily/${NAME}.gz" "$BACKUP_DIR/weekly/"
fi
if [ "$(date +%d)" = "01" ]; then
  cp "$BACKUP_DIR/daily/${NAME}.gz" "$BACKUP_DIR/monthly/"
fi

# 3. Retention
# Keeps the newest $2 backups in $1. Safe when the folder is still empty.
prune() {
  local dir="$1" keep="$2"
  find "$dir" -maxdepth 1 -type f -name 'wedding-*.db.gz' -printf '%T@ %p\n' \
    | sort -rn | tail -n +"$((keep + 1))" | cut -d' ' -f2- | xargs -r rm -f --
}
prune "$BACKUP_DIR/daily" "$KEEP_DAILY"
prune "$BACKUP_DIR/weekly" "$KEEP_WEEKLY"
prune "$BACKUP_DIR/monthly" "$KEEP_MONTHLY"

# 4. Off-site copy. Do not rely on the VPS alone.
if [ -n "$RCLONE_REMOTE" ]; then
  rclone sync "$BACKUP_DIR" "$RCLONE_REMOTE" --exclude ".tmp-*"
fi

echo "$(date '+%F %T') backup ok: $BACKUP_DIR/daily/${NAME}.gz"
