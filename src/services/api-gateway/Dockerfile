# Heady™ API Gateway — Multi-stage distroless build
# © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents

FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm ci --production
COPY . .

FROM gcr.io/distroless/nodejs20-debian12
COPY --from=build /app /app
WORKDIR /app
ENV NODE_ENV=production
EXPOSE 3370
CMD ["index.js"]
