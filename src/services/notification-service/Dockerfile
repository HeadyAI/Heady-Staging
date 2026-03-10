FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/

FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3381

EXPOSE 3381

CMD ["src/index.js"]
