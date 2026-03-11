# heady-testing v4.0.0 — Heady™ Testing Framework Container
# Build from monorepo root: docker build -f services/heady-testing/Dockerfile .
FROM node:20-alpine AS deps
WORKDIR /app/services/heady-testing
COPY services/heady-testing/package.json ./
RUN npm ci --production

FROM node:20-alpine AS runtime
RUN apk add --no-cache tini curl
WORKDIR /app
# Copy shared foundation
COPY shared/phi-math.js shared/logger.js ./shared/
# Copy service
COPY --from=deps /app/services/heady-testing/node_modules ./services/heady-testing/node_modules
COPY services/heady-testing/ ./services/heady-testing/
WORKDIR /app/services/heady-testing
ENV NODE_ENV=production PORT=3343
EXPOSE 3343
USER node
HEALTHCHECK --interval=13s --timeout=5s --retries=3 \
  CMD curl -sf http://127.0.0.1:3343/healthz || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
