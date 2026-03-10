# ─────────────────────────────────────────────────────────────
# heady-receipt-signer — Production Dockerfile
# Multi-stage build. Workspace-aware, container-ready, zero 127.0.0.1 references.
# All runtime config from environment variables (Law #5).
# ─────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
WORKDIR /app

# Install workspace dependencies for the shared platform and target service.
COPY package.json ./
COPY packages/platform/package.json ./packages/platform/
COPY services/heady-receipt-signer/package.json ./services/heady-receipt-signer/
RUN npm install --workspace=packages/platform --workspace=services/heady-receipt-signer --omit=dev

# Copy source into the same workspace layout used at runtime.
FROM base AS build
COPY packages/platform/src ./packages/platform/src
COPY services/heady-receipt-signer/src ./services/heady-receipt-signer/src

# Production image
FROM base AS production
COPY --from=build /app/packages/platform/src ./packages/platform/src
COPY --from=build /app/services/heady-receipt-signer/src ./services/heady-receipt-signer/src

ENV NODE_ENV=production
ENV SERVICE_NAME=heady-receipt-signer
ENV PORT=3338

EXPOSE 3338
# Prometheus metrics
EXPOSE 9464

HEALTHCHECK --interval=7s --timeout=4s --start-period=30s --retries=3 \
  CMD wget -qO- http://0.0.0.0:3338/health/live || exit 1

USER node
CMD ["node", "services/heady-receipt-signer/src/index.js"]
