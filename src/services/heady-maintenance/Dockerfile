# heady-maintenance — Multi-stage production build
# Heady™ Latent OS — Sacred Geometry v4.0
# © 2026 HeadySystems Inc. — Eric Haywood, Founder

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts
COPY . .

FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
ENV PORT=3335
EXPOSE 3335
USER nonroot
CMD ["index.js"]
