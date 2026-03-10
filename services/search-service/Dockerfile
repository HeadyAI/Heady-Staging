FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/

FROM node:20-alpine
RUN addgroup -S heady && adduser -S heady -G heady
WORKDIR /app
COPY --from=builder /app ./
USER heady
EXPOSE 8089
HEALTHCHECK --interval=21s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8089/healthz || exit 1
CMD ["node", "src/index.js"]
