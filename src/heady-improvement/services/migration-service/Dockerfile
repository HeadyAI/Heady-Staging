FROM node:20-alpine AS base
LABEL maintainer="Eric Haywood <eric@headyconnection.org>"
LABEL org.opencontainers.image.title="HeadySystems Migration Service"
LABEL org.opencontainers.image.vendor="HeadySystems Inc."

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application
COPY src/ ./src/
COPY .env.example ./.env.example

# Non-root user
RUN addgroup -g 1001 heady && adduser -u 1001 -G heady -s /bin/sh -D heady
USER heady

# Health check
HEALTHCHECK --interval=34s --timeout=8s --start-period=13s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-4020}/health || exit 1

EXPOSE 4020
CMD ["node", "src/index.js"]
