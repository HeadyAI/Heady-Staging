# heady-testing — Heady™ Service Container
# Multi-stage build, phi-scaled everything
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm ci --production

FROM node:22-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production PORT=3343
EXPOSE 3343
USER node
HEALTHCHECK --interval=7s --timeout=4s --retries=3 \
  CMD wget -qO- http://localhost:3343/healthz || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
