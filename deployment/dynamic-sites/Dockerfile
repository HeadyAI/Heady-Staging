# ── Dynamic Sites Server ─────────────────────────────────────
# Multi-stage distroless build for Cloud Run

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/core/dynamic-site-server.js ./src/core/
COPY src/utils/logger.js ./src/utils/

FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["src/core/dynamic-site-server.js"]
