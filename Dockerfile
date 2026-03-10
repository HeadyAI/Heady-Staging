# Heady — Multi-stage Production Build
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build --if-present

FROM node:20-slim AS production
WORKDIR /app
RUN groupadd -r heady && useradd -r -g heady heady
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app .
RUN mkdir -p data/memory data/logs data/checkpoints && chown -R heady:heady /app
USER heady
EXPOSE 3301
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const h=require('http');h.get('http://localhost:3301/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "heady-manager.js"]
