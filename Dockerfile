# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
# ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
# ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
# ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
# ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
# ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
# ║                                                                  ║
# ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
# ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
# ║  FILE: Dockerfile                                                    ║
# ║  LAYER: root                                                  ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END
FROM node:20-alpine

WORKDIR /app

# Install build essentials for native addons
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./

# Install with preferred package manager
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm install --frozen-lockfile --prod; \
    elif [ -f yarn.lock ]; then \
      yarn install --production --frozen-lockfile; \
    else \
      npm ci --omit=dev; \
    fi

# ─── Stage 2: Build ──────────────────────────────────────────────────────────

FROM node:22-alpine AS build

WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Run build if build script exists
RUN if grep -q '"build"' package.json; then \
      npm run build 2>/dev/null || true; \
    fi

# Prune dev dependencies
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm prune --prod; \
    else \
      npm prune --omit=dev 2>/dev/null || true; \
    fi

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
<<<<<<< HEAD
  CMD wget -qO- http://localhost:3300/api/health || exit 1
=======
  CMD wget -qO- http://api.headysystems.com:3300/api/health || exit 1
>>>>>>> a3d7d06c432bf92df85e53f8d0cf1e6c8622ccea

FROM node:22-alpine AS production

# Install tini for proper PID 1 signal handling (SIGTERM → graceful shutdown)
RUN apk add --no-cache tini curl

# Create non-root heady user
RUN addgroup -g 1001 -S heady && \
    adduser -S heady -u 1001 -G heady

WORKDIR /app

# Copy production artifacts
COPY --from=build --chown=heady:heady /app/node_modules ./node_modules
COPY --from=build --chown=heady:heady /app/src ./src
COPY --from=build --chown=heady:heady /app/shared ./shared
COPY --from=build --chown=heady:heady /app/configs ./configs
COPY --from=build --chown=heady:heady /app/scripts ./scripts
COPY --from=build --chown=heady:heady /app/docs ./docs
COPY --from=build --chown=heady:heady /app/package.json ./
COPY --from=build --chown=heady:heady /app/heady-manager.js ./

# Copy heady-hive-sdk if it exists
COPY --from=build --chown=heady:heady /app/heady-hive-sdk ./heady-hive-sdk 2>/dev/null || true

# Switch to non-root
USER heady

# Environment
ENV NODE_ENV=production
ENV HEADY_ENV=production
ENV PORT=3301

# V8 tuning: 512MB heap, optimized for server workload
ENV NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size"

# Expose port
EXPOSE 3301

# Health check: liveness probe on /health/live
HEALTHCHECK --interval=13s --timeout=5s --start-period=34s --retries=3 \
  CMD curl -f http://localhost:3301/health/live || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start Heady
CMD ["node", "heady-manager.js"]
