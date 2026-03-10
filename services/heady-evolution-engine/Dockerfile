# ─────────────────────────────────────────────────────────────
# heady-evolution-engine — Production Dockerfile
# Multi-stage build. Workspace-aware, container-ready, zero 127.0.0.1 references.
# All runtime config from environment variables (Law #5).
# ─────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
WORKDIR /app

# Install workspace dependencies for the shared platform and target service.
COPY package.json ./
COPY packages/platform/package.json ./packages/platform/
COPY services/heady-evolution-engine/package.json ./services/heady-evolution-engine/
RUN npm install --workspace=packages/platform --workspace=services/heady-evolution-engine --omit=dev

# Copy source into the same workspace layout used at runtime.
FROM base AS build
COPY packages/platform/src ./packages/platform/src
COPY services/heady-evolution-engine/src ./services/heady-evolution-engine/src

# Production image
FROM base AS production
COPY --from=build /app/packages/platform/src ./packages/platform/src
COPY --from=build /app/services/heady-evolution-engine/src ./services/heady-evolution-engine/src

ENV NODE_ENV=production
ENV SERVICE_NAME=heady-evolution-engine
ENV PORT=3336

EXPOSE 3336
# Prometheus metrics
EXPOSE 9464

HEALTHCHECK --interval=7s --timeout=4s --start-period=30s --retries=3 \
  CMD wget -qO- http://0.0.0.0:3336/health/live || exit 1

USER node
CMD ["node", "services/heady-evolution-engine/src/index.js"]
