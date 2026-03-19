# ═══════════════════════════════════════════════════════════════════════
#  HEADY SYSTEMS — Production Dockerfile
#  ∞ Sacred Geometry · Organic Systems · Breathing Interfaces
# ═══════════════════════════════════════════════════════════════════════
#
#  Multi-stage build with phi-derived resource configuration.
#  Target: Google Cloud Run
#
# ─── Stage 1: Build ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts

# Copy application source
COPY . .

# Remove dev artifacts
RUN rm -rf .git .github .turbo .heady_cache tests __tests__ \
    *.test.js *.spec.js .eslintrc.json .prettierrc.json \
    scripts/kill-port.ps1 scripts/Heady-Sync.ps1

# ─── Stage 2: Production ─────────────────────────────────────────────
FROM node:22-alpine AS production

# Security: non-root user
RUN addgroup -g 1001 heady && adduser -u 1001 -G heady -D heady

WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=heady:heady /app /app

# Security headers
ENV NODE_ENV=production
ENV PORT=3000

# Health check — phi-scaled interval (13s check, 8s timeout, 5 retries)
HEALTHCHECK --interval=13s --timeout=8s --start-period=21s --retries=5 \
  CMD node -e "const http=require('http');const r=http.get('http://0.0.0.0:'+process.env.PORT+'/health',{timeout:5000},(res)=>{process.exit(res.statusCode===200?0:1)});r.on('error',()=>process.exit(1))"

# Switch to non-root user
USER heady

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "heady-manager.js"]
