# ————————————————————————————————————————————
# Heady™ Service Dockerfile — Multi-stage Distroless
# © 2026 HeadySystems Inc. — Eric Haywood, Founder
# ————————————————————————————————————————————

# Stage 1: Build
FROM node:22-slim AS builder
WORKDIR /build
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY . .

# Stage 2: Production (Distroless Node)
FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
COPY --from=builder /build /app

# Shared modules from monorepo root
COPY --from=builder /build/../../shared /app/shared

EXPOSE 3394
ENV NODE_ENV=production
ENV SERVICE_PORT=3394

CMD ["index.js"]
