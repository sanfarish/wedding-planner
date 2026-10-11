# Wedding planner container image (works with Podman 3.4+ and Docker).
#   podman build -f Containerfile -t wedding-planner .
# Normally built by GitHub Actions and pulled from ghcr.io/sanfarish/wedding-planner.
#
# Image names are fully qualified so older Podman never prompts about short names.
# npm runs with --ignore-scripts: better-sqlite3 and argon2 ship prebuilt binaries
# that load at runtime, so nothing needs compiling (the slim image has no compiler).

# ---------- Build: install everything, compile server and client ----------
FROM docker.io/library/node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY shared shared
COPY server server
COPY client client
RUN npm run build

# ---------- Runtime: production server dependencies + compiled output ----------
FROM docker.io/library/node:22-bookworm-slim

LABEL org.opencontainers.image.title="wedding-planner" \
      org.opencontainers.image.description="Private wedding planner for two" \
      org.opencontainers.image.source="https://github.com/sanfarish/wedding-planner"

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    TZ=Asia/Jakarta \
    DATABASE_PATH=/app/server/data/wedding.db \
    SERVE_CLIENT=true \
    MIGRATE_ON_START=true \
    TRUST_PROXY=1

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
# Peer/optional packages from the shared lockfile (vite, typescript…) aren't needed at runtime.
RUN npm ci --omit=dev --omit=peer --omit=optional --ignore-scripts --no-audit --no-fund -w server \
    && npm cache clean --force

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist

# The database lives here; mount a host directory over it to keep data across upgrades.
RUN mkdir -p server/data && chown node:node server/data

USER node
EXPOSE 3000
CMD ["node", "server/dist/server.js"]
