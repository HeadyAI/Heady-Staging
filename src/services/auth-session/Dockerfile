# Heady™ Auth Session Server — Dockerfile
# Domain: auth.headysystems.com | Port: 3360
# Author: Eric Haywood <eric@headysystems.com>
# © 2026 HeadySystems Inc. — 51 Provisional Patents

FROM node:20-slim AS builder
WORKDIR /build
COPY shared/ ./shared/
COPY package*.json ./
COPY services/auth-session/package*.json ./services/auth-session/
RUN cd services/auth-session && npm ci --production
COPY services/auth-session/ ./services/auth-session/
COPY src/ ./src/
COPY configs/ ./configs/

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=builder /build/ .
ENV NODE_ENV=production SERVICE_NAME=auth-session SERVICE_PORT=3360
EXPOSE 3360
HEALTHCHECK --interval=4s --timeout=3s --retries=3 --start-period=7s \
  CMD ["node", "-e", "require('http').get('http://localhost:3360/health', r => { r.statusCode === 200 ? process.exit(0) : process.exit(1) }).on('error', () => process.exit(1))"]
CMD ["node", "services/auth-session/index.js"]
