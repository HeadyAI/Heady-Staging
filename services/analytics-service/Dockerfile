FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./

RUN npm ci

COPY src ./src

RUN npm run build && npm prune --production

FROM gcr.io/distroless/nodejs20-nonroot

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV LOG_LEVEL=info

EXPOSE 3360

CMD ["dist/index.js"]
