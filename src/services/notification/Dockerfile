# Heady™ Notification Service — Dockerfile
# Port: 3361 | WebSocket + SSE + NATS JetStream
# Author: Eric Haywood <eric@headysystems.com>
# © 2026 HeadySystems Inc. — 51 Provisional Patents

FROM node:20-slim AS builder
WORKDIR /build
COPY shared/ ./shared/
COPY package*.json ./
COPY services/notification/package*.json ./services/notification/
RUN cd services/notification && npm ci --production
COPY services/notification/ ./services/notification/
COPY src/ ./src/
COPY configs/ ./configs/

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=builder /build/ .
ENV NODE_ENV=production SERVICE_NAME=notification SERVICE_PORT=3361
EXPOSE 3361
HEALTHCHECK --interval=4s --timeout=3s --retries=3 --start-period=7s \
  CMD ["node", "-e", "require('http').get('http://localhost:3361/health', r => { r.statusCode === 200 ? process.exit(0) : process.exit(1) }).on('error', () => process.exit(1))"]
CMD ["node", "services/notification/index.js"]
