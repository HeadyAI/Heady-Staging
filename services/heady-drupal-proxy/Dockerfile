# ─────────────────────────────────────────────────────────────
# heady-drupal-proxy — Production Dockerfile
# Multi-stage build. Workspace-aware, container-ready, zero 127.0.0.1 references.
# All runtime config from environment variables (Law #5).
# ─────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
WORKDIR /app

# Install workspace dependencies for the shared platform and target service.
COPY package.json ./
COPY packages/platform/package.json ./packages/platform/
COPY services/heady-drupal-proxy/package.json ./services/heady-drupal-proxy/
RUN npm install --workspace=packages/platform --workspace=services/heady-drupal-proxy --omit=dev

# Copy source into the same workspace layout used at runtime.
FROM base AS build
COPY packages/platform/src ./packages/platform/src
COPY services/heady-drupal-proxy/src ./services/heady-drupal-proxy/src

# Production image
FROM base AS production
COPY --from=build /app/packages/platform/src ./packages/platform/src
COPY --from=build /app/services/heady-drupal-proxy/src ./services/heady-drupal-proxy/src

ENV NODE_ENV=production
ENV SERVICE_NAME=heady-drupal-proxy
ENV PORT=3342

EXPOSE 3342
# Prometheus metrics
EXPOSE 9464

HEALTHCHECK --interval=7s --timeout=4s --start-period=30s --retries=3 \
  CMD wget -qO- http://0.0.0.0:3342/health/live || exit 1

USER node
CMD ["node", "services/heady-drupal-proxy/src/index.js"]
