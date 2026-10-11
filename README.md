# 💍 Our Wedding: private wedding planner

A small, private web app for two people planning their wedding together: tasks, budget, guests, vendors, timeline, notes, document links, an activity feed and a countdown dashboard.

It runs on one small Ubuntu VPS. It has no public sign-up; exactly two accounts are created from the command line.

## Contents

1. [Tech stack](#tech-stack)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Environment variables](#environment-variables)
5. [Database migrations](#database-migrations)
6. [Creating users](#creating-users)
7. [Development](#development)
8. [Building for production](#building-for-production)
9. [Running in production](#running-in-production)
10. [Backups](#backups)
11. [Deploy with Podman (recommended)](#deploy-with-podman-recommended)
12. [Alternative: Node + PM2](#alternative-node--pm2)
13. [Nginx (Node + PM2)](#nginx-node--pm2)
14. [PM2](#pm2)
15. [Project structure](#project-structure)
16. [Production checklist](#production-checklist)

---

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | Vue 3, TypeScript, Vite, Vue Router, Pinia, Vuetify 3 |
| Backend | Node.js, Express 5, TypeScript, Zod validation |
| Database | SQLite via `better-sqlite3` (WAL mode, foreign keys on) |
| Auth | Argon2id password hashes and server-side sessions stored in SQLite, sent as an HTTP-only cookie |
| Infra | Nginx (TLS), a rootless Podman container run by systemd (or Node + PM2), cron backups |

```text
Browser ──HTTPS──► Nginx ──► client/dist (static Vue app)
                     └────► /api/* ──► Express on 127.0.0.1:3000 ──► server/data/wedding.db
```

Two versions are deliberately pinned in the root `package.json` `overrides`:

- **Vuetify `^3.13`.** npm's `latest` is now 4.x; the app is built and tested against v3.
- **TypeScript `~5.9`.** `vue-tsc` doesn't support the TypeScript 7 native compiler yet.

## Requirements

- Node.js **20.19+** (22 or 24 LTS recommended) and npm 10+.
- No C/C++ build tools needed: `better-sqlite3` and `argon2` ship prebuilt binaries for Linux, macOS and Windows.
- For production: Ubuntu with Nginx and Certbot, plus either **Podman 3.4+** (the image is built by GitHub Actions) or Node + PM2.

## Installation

```bash
git clone <repo> wedding-plan.sanfarish.com
cd wedding-plan.sanfarish.com
npm install
cp .env.example .env      # then edit it, see below
npm run db:migrate
npm run create-user       # run twice: once for each of you
```

## Environment variables

They live in the root `.env` file. Never commit `.env`; it is in `.gitignore`.

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` on the VPS |
| `HOST` | `127.0.0.1` | Keep Express on localhost; Nginx is the only public entry point |
| `PORT` | `3000` | Change it if another app on the VPS already uses 3000 |
| `DATABASE_PATH` | `./data/wedding.db` | Relative to `server/` |
| `UPLOAD_DIR` | `./uploads` | Reserved for future file uploads |
| `SESSION_SECRET` | none | **Required in production**: at least 32 random characters. The server refuses to start without one |
| `TZ` | `Asia/Jakarta` | Used for the countdown and "overdue" dates |
| `SERVE_CLIENT` | `false` | Express also serves the built Vue app (on in the container image) |
| `CLIENT_DIST` | `../client/dist` | Built client location, relative to `server/` |
| `MIGRATE_ON_START` | on, except in production | Apply pending migrations when the server starts (on in the container image) |
| `TRUST_PROXY` | `loopback` | Which proxies to trust for client IP and HTTPS. The container uses `1` (exactly one hop: Nginx) |

The container image sets `NODE_ENV`, `HOST`, `PORT`, `DATABASE_PATH`, `SERVE_CLIENT`, `MIGRATE_ON_START` and `TRUST_PROXY` itself. On the VPS its `.env` only needs `SESSION_SECRET` (see `deploy/podman/wedding.env.example`).

To generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Database migrations

Migrations are plain SQL files in `server/src/db/migrations/NNN_name.sql`. Each one runs once, inside a transaction, and is recorded in the `migrations` table.

```bash
npm run db:migrate                     # development (or anywhere dev deps are installed)
node server/dist/scripts/migrate.js    # production, after `npm run build`
```

The development server and the container apply pending migrations on startup (`MIGRATE_ON_START`). A plain Node production install does not: run the migrate command after deploying a new version.

To change the schema, add a new numbered file (e.g. `002_add_seating.sql`). Never edit a migration that has already run in production.

## Creating users

There is no registration page. Create both accounts on the server:

```bash
npm run create-user                        # development
node server/dist/scripts/create-user.js    # production
```

The script asks for a username, a display name and a password (at least 10 characters, typed twice and hidden). It refuses to create a third account. Either of you can later change your display name and password under **Settings**.

## Development

```bash
npm run dev        # Express on :3000 (auto-restart) + Vite on :5173
npm run db:seed    # optional: fictional sample data (refuses to run in production)
npm test           # server tests (Vitest + supertest, in-memory SQLite)
npm run typecheck  # server tsc + client vue-tsc
```

Open http://localhost:5173. Vite proxies `/api` to Express, so the browser talks to a single origin, just as it does behind Nginx in production.

If the database has fewer than two users, `db:seed` creates `demo-groom` / `demo-bride` with the password `planner-demo-1`.

## Building for production

```bash
npm run build
```

This produces:

- `server/dist/`: compiled API, scripts, and a copy of the SQL migrations.
- `client/dist/`: the static Vue app that Nginx serves.

## Running in production

```bash
npm start                               # = node server/dist/server.js
pm2 start deploy/ecosystem.config.cjs   # what you actually use on the VPS, see PM2
```

In production:

- Cookies are `Secure`, so the app must be reached through HTTPS (Nginx).
- Error responses never include stack traces.
- Login is rate-limited to 5 failed attempts per IP per 15 minutes.

## Backups

The database is a single file, and losing it means losing everything. `scripts/backup-db.sh` does four things:

1. Takes a consistent snapshot with SQLite's online backup API, which is safe while the app is running, and runs an integrity check on the copy.
2. Compresses it into `/backups/wedding/daily/`, with a copy in `weekly/` on Sundays and in `monthly/` on the 1st.
3. Keeps 14 daily, 8 weekly and 12 monthly copies.
4. Optionally syncs everything off the VPS with `rclone`. Do this: a VPS-only backup isn't a backup.

```bash
sudo mkdir -p /backups/wedding && sudo chown "$USER" /backups/wedding
chmod +x scripts/backup-db.sh

# One-time rclone setup for off-site copies (e.g. Google Drive, Backblaze B2, S3)
sudo apt install rclone && rclone config

# Daily at 02:30
crontab -e
30 2 * * * RCLONE_REMOTE="gdrive:wedding-backups" /var/www/wedding-plan.sanfarish.com/scripts/backup-db.sh >> /var/log/wedding-backup.log 2>&1
```

For a one-off backup: `node server/dist/scripts/backup.js [output-file]`.

**With Podman**, the snapshot is taken inside the container. Point the script at the container and its data folder; no sudo is needed:

```bash
30 2 * * * CONTAINER=wedding DATA_DIR=$HOME/wedding/data BACKUP_DIR=$HOME/wedding/backups RCLONE_REMOTE="gdrive:wedding-backups" $HOME/wedding-planner/scripts/backup-db.sh >> $HOME/wedding/backup.log 2>&1
```

**Restore (Node + PM2):**

```bash
pm2 stop wedding-planner
gunzip -c /backups/wedding/daily/wedding-YYYYMMDD-HHMMSS.db.gz > server/data/wedding.db
rm -f server/data/wedding.db-wal server/data/wedding.db-shm
pm2 start wedding-planner
```

**Restore (Podman):**

```bash
systemctl --user stop container-wedding
gunzip -c ~/wedding/backups/daily/wedding-YYYYMMDD-HHMMSS.db.gz > ~/wedding/data/wedding.db
rm -f ~/wedding/data/wedding.db-wal ~/wedding/data/wedding.db-shm
systemctl --user start container-wedding
```

## Deploy with Podman (recommended)

GitHub Actions tests every push to `main` and publishes the image to `ghcr.io/sanfarish/wedding-planner` (`.github/workflows/container.yml`). The VPS never builds anything: it pulls the image and runs it as a **rootless** container for your normal user, kept alive by a systemd user service. These steps work with Podman **3.4.2** on Ubuntu 20.04.

```text
Browser ──HTTPS──► Nginx (host) ──► 127.0.0.1:3000 ──► container "wedding" (Vue app + API)
                                                         └── ~/wedding/data/wedding.db (host folder)
```

**Notes specific to Podman 3.4:**

- Quadlet isn't available, so `run.sh` uses `podman generate systemd --new`.
- Rootless port forwarding hides Nginx's loopback address, so the image sets `TRUST_PROXY=1`, and the Nginx config overwrites `X-Forwarded-For` so clients can't fake their IP.
- The image is published without attestation manifests, which old Podman can't read.

**1. Make the image public (once).** After the first workflow run, open GitHub → your profile → **Packages** → `wedding-planner` → **Package settings** → **Change visibility** → **Public**.

To keep it private instead, run `podman login ghcr.io` on the VPS with a personal access token that has `read:packages`.

**2. Point DNS.** Add an A record `wedding-plan` → your VPS IP, and check it with `dig +short wedding-plan.sanfarish.com`.

**3. Prepare the VPS.** Log in over SSH as your user, not via `su`/`sudo -i`, because rootless systemd needs a real login session.

```bash
uname -m                                   # must be x86_64 (the image is linux/amd64)
podman --version                           # 3.4.x or newer
sudo loginctl enable-linger "$USER"        # start your containers at boot without logging in
sudo ss -ltnp | grep ':3000'               # no output = port 3000 is free (else set HOST_PORT below)

git clone https://github.com/sanfarish/wedding-planner.git ~/wedding-planner   # only for deploy/ and scripts/
mkdir -p ~/wedding
cp ~/wedding-planner/deploy/podman/wedding.env.example ~/wedding/.env
sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" ~/wedding/.env
chmod 600 ~/wedding/.env
```

**4. Start the container.**

```bash
~/wedding-planner/deploy/podman/run.sh          # or: HOST_PORT=3100 ~/wedding-planner/deploy/podman/run.sh
```

It pulls the image, starts it on `127.0.0.1:3000` with `~/wedding/data` mounted for the database, waits until it's healthy, and installs and enables the `container-wedding` user service. You can re-run it any time.

**5. Create your two accounts** (first time only):

```bash
podman exec -it wedding node server/dist/scripts/create-user.js    # you
podman exec -it wedding node server/dist/scripts/create-user.js    # your partner
```

**6. HTTPS and Nginx.** The container serves the Vue app and the API, so Nginx only proxies:

```bash
sudo certbot certonly --nginx -d wedding-plan.sanfarish.com
sudo cp ~/wedding-planner/deploy/nginx/wedding-plan.sanfarish.com.podman.conf /etc/nginx/sites-available/wedding-plan.sanfarish.com.conf
sudo ln -s /etc/nginx/sites-available/wedding-plan.sanfarish.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

If you used another `HOST_PORT`, change `proxy_pass` to match. Then open **https://wedding-plan.sanfarish.com**.

**7. Firewall.** If `sudo ufw status` says inactive, allow SSH **first**:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

**8. Backups.** Add the Podman cron line from [Backups](#backups) with `crontab -e`, and run it once by hand to check that it prints `backup ok`.

**Updating.** Every push to `main` publishes a new image. To deploy it:

```bash
cd ~/wedding-planner && git pull          # picks up changes to the deploy scripts, if any
./deploy/podman/update.sh                 # backup → pull → restart; migrations run on start
```

`run.sh` also labels the container for `podman auto-update`. If you'd rather update automatically, `systemctl --user enable --now podman-auto-update.timer` pulls and restarts daily. The trade-off is that you no longer choose when updates happen, and no backup is taken first.

**Day-to-day commands:**

```bash
systemctl --user status container-wedding
journalctl --user -u container-wedding -f      # or: podman logs -f wedding
systemctl --user restart container-wedding
podman exec -it wedding sh                      # a shell inside the container
```

**Troubleshooting:**

| Problem | Fix |
| --- | --- |
| `Failed to connect to bus` / `XDG_RUNTIME_DIR` errors | You switched user with `su`. Log in over SSH as that user instead |
| 502 from Nginx | The container is down: check `systemctl --user status container-wedding` and the journal |
| Login works but you are logged out immediately | You opened it over `http://`. The cookie is `Secure`, so use `https://` |
| `Invalid environment configuration` in the logs | `SESSION_SECRET` in `~/wedding/.env` is missing or shorter than 32 characters |
| Doesn't start after reboot | `loginctl show-user $USER -p Linger` must say `Linger=yes` |

## Alternative: Node + PM2

Use this instead of Podman if you'd rather run Node directly on the host.

The paths below assume `/var/www/wedding-plan.sanfarish.com`. If you use another path, update the Nginx file to match.

**1. Get the code and build it on the VPS.** Never copy `node_modules` from Windows, because the native modules differ per OS.

```bash
sudo mkdir -p /var/www/wedding-plan.sanfarish.com && sudo chown "$USER" /var/www/wedding-plan.sanfarish.com
git clone <repo> /var/www/wedding-plan.sanfarish.com
cd /var/www/wedding-plan.sanfarish.com
npm ci
cp .env.example .env && nano .env    # NODE_ENV=production, a real SESSION_SECRET, PORT
npm run build
node server/dist/scripts/migrate.js
node server/dist/scripts/create-user.js   # twice
chmod 600 .env && chmod 700 server/data
```

**2. Point DNS** for `wedding-plan.sanfarish.com` (an A/AAAA record) at the VPS.

**3. Get a TLS certificate and enable the site.** See [Nginx (Node + PM2)](#nginx-node--pm2).

**4. Start the app with PM2.** See [PM2](#pm2).

**5. Set up the firewall.** Only SSH and web should be reachable; port 3000 must stay closed:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

**6. Set up backups.** See [Backups](#backups).

**Updating to a new version:**

```bash
cd /var/www/wedding-plan.sanfarish.com
./scripts/backup-db.sh             # safety copy first
git pull
npm ci
npm run build
node server/dist/scripts/migrate.js
pm2 reload wedding-planner
```

## Nginx (Node + PM2)

For the Podman setup, use `deploy/nginx/wedding-plan.sanfarish.com.podman.conf` as described above. The Node + PM2 site config is `deploy/nginx/wedding-plan.sanfarish.com.conf`. It:

- terminates HTTPS and redirects HTTP to HTTPS;
- serves `client/dist`, falling back to `index.html` for client-side routes;
- proxies `/api/` to `127.0.0.1:3000`;
- sends security headers (HSTS, CSP, frame denial, `noindex`).

Nothing under `server/` (database, uploads) is ever served.

Because the HTTPS server block references certificate files, get the certificate first:

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot
sudo certbot certonly --nginx -d wedding-plan.sanfarish.com    # or --webroot -w /var/www/certbot

sudo cp deploy/nginx/wedding-plan.sanfarish.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/wedding-plan.sanfarish.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Certbot installs a renewal timer automatically; check it with `sudo certbot renew --dry-run`.

If `PORT` in `.env` isn't 3000, change the `proxy_pass` line to match.

## PM2

The process file is `deploy/ecosystem.config.cjs`: one fork-mode process with `NODE_ENV=production`, `HOST=127.0.0.1` and `TZ=Asia/Jakarta`. It must stay a single process, because of SQLite and the in-memory login rate limiter. Secrets stay in `.env`.

```bash
sudo npm install -g pm2
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup        # run the command it prints, so the app starts on boot
```

Useful commands:

```bash
pm2 status
pm2 logs wedding-planner
pm2 reload wedding-planner
pm2 restart wedding-planner
```

If you change `PORT`, update it in both `.env` and the ecosystem file. The ecosystem `env` takes precedence over `.env`.

## Project structure

```text
client/                 Vue 3 SPA
  src/pages/            One page per route
  src/components/       Layout, shared UI (DataTable, FormDialog, StatCard…) and forms/
  src/services/         All HTTP calls (fetch wrapper in api.ts)
  src/stores/           Pinia: auth + wedding settings/users only
  src/composables/      useAsyncData, useConfirm, useNotify, useMoney, useFormState…
server/
  src/routes → controllers → services     Thin controllers; services hold the logic and prepared SQL
  src/validation/       Zod schemas for every request body and query
  src/db/               Connection, migration runner, SQLite session store, migrations/*.sql
  src/scripts/          migrate, create-user, seed, backup
  test/                 Vitest + supertest API tests
  data/                 wedding.db (gitignored)
shared/src/index.ts     Types shared by client and server (types only, no runtime code)
Containerfile           Multi-stage container image (built by .github/workflows/container.yml)
deploy/podman/          run.sh, update.sh and the .env template for rootless Podman
deploy/nginx/           Nginx sites: *.podman.conf (proxy to the container) and the Node + PM2 variant
deploy/ecosystem.config.cjs   PM2 process file (Node + PM2 alternative)
scripts/backup-db.sh    Cron backup with rotation, optional off-site sync, and a container mode
```

### API overview

Every route except `/api/health` and `/api/auth/login` requires a session.

Responses use one shape:

- a single item: `{ "data": {...} }`
- a list: `{ "data": [...], "meta": { "total": n } }`
- an error: `{ "error": { "code", "message", "details" } }`

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET\|PATCH /api/auth/me`, `PATCH /api/auth/password` |
| Settings | `GET\|PATCH /api/settings/wedding`, `GET /api/users` |
| Dashboard | `GET /api/dashboard`, `GET /api/activity?page&limit` |
| Tasks | `/api/tasks` (CRUD), `PATCH /api/tasks/:id/complete`, `/api/task-categories` |
| Budget | `GET /api/budget/summary`, `/api/expenses` (CRUD), `/api/budget-categories` |
| Guests | `/api/guests` (CRUD), `GET /api/guests/groups` |
| Vendors, timeline, notes, documents | `/api/vendors`, `/api/timeline`, `/api/notes`, `/api/documents` (CRUD) |

List endpoints accept simple filters, e.g. `?status=todo&assignedTo=1&search=venue`. They also accept optional `?page=&limit=` paging, with `limit` capped at 100.

### Budget figures

- *Estimated* is the planned cost.
- *Actual* is the amount paid so far.
- *Remaining* = estimated − paid.
- *Unallocated* = the total budget (set in Settings) − estimated.

Cancelled expenses are excluded from all totals. Money is stored as whole currency units in integer columns, never as floats.

## Production checklist

```text
[ ] HTTPS works and HTTP redirects to HTTPS
[ ] curl http://<vps-ip>:3000 fails from outside (Express bound to 127.0.0.1, ufw on)
[ ] NODE_ENV=production and a strong SESSION_SECRET in .env (chmod 600)
[ ] Both users created; login, logout and password change work
[ ] Login cookie shows HttpOnly, Secure, SameSite=Lax in browser devtools
[ ] Unauthenticated /api/tasks returns 401
[ ] 6 wrong logins in a row return "Too many login attempts"
[ ] App comes back after `sudo reboot` (Podman: Linger=yes + container-wedding enabled; PM2: pm2 startup + pm2 save)
[ ] Migrations applied (Podman: automatic on start; PM2: node server/dist/scripts/migrate.js says "up to date")
[ ] Backup cron runs; a backup restores successfully; off-site copy exists
[ ] Tried on a phone: navigation, adding a task/expense/guest, delete confirmations
```
