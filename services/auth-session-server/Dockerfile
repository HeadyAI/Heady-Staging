# Multi-stage build for optimal image size
# Final image < 100MB using distroless base

# ============================================================================
# Build Stage
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm ci --only=development

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ============================================================================
# Dependencies Stage
# ============================================================================
FROM node:20-alpine AS dependencies

WORKDIR /deps

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================================================
# Runtime Stage (Distroless)
# ============================================================================
FROM gcr.io/distroless/nodejs20-debian11:nonroot

# Set labels
LABEL org.opencontainers.image.title="HEADY Auth Session Server"
LABEL org.opencontainers.image.description="Central authentication session service for HEADY platform"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/headysystems/auth-session-server"

WORKDIR /app

# Copy built application from builder
COPY --from=builder /build/dist ./dist

# Copy dependencies from dependencies stage
COPY --from=dependencies /deps/node_modules ./node_modules

# Copy package.json for metadata
COPY package.json ./

# Copy relay iframe
COPY src/relay/iframe.html ./dist/relay/

# Set environment
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=256

# Expose port
EXPOSE 3310

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["/nodejs/bin/node", "-e", \
         "require('http').get('http://localhost:3310/api/auth/health', (res) => { if (res.statusCode !== 200) throw new Error('Health check failed'); });"]

# Run as non-root user (distroless)
USER nonroot:nonroot

# Start application
CMD ["dist/index.js"]
