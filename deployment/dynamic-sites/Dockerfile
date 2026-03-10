# Cloud Run Dynamic Sites — Multi-Stage Dockerfile
# ═══════════════════════════════════════════════════════════════
# Serves 15 Heady™ branded sites from a single container
# via Host header routing. Auto-TLS via Cloud Run domain mapping.
#
# Build: docker build -f deployment/dynamic-sites/Dockerfile -t heady-sites .
# Run:   docker run -p 8080:8080 heady-sites
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Build ───────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# ── Stage 2: Production Runtime ──────────────────────────────
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY src/core/dynamic-site-server.js ./src/core/
COPY src/shared/ ./src/shared/
COPY shared/ ./shared/

# Cloud Run uses PORT env (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Health check metadata (Cloud Run uses HTTP probes, not Docker HEALTHCHECK)
LABEL maintainer="HeadySystems Inc. <ops@headysystems.com>"
LABEL description="Heady™ Dynamic Multi-Domain Site Server — 15 sites, 25 auth providers"
LABEL version="3.3.0"

# Run as non-root (distroless default user)
USER 1000

# Entrypoint — distroless uses the node binary directly
CMD ["src/core/dynamic-site-server.js"]
