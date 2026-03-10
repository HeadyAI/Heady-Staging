FROM node:22-slim AS builder
WORKDIR /build
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY . .

FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
COPY --from=builder /build /app
COPY --from=builder /build/../../shared /app/shared
EXPOSE 3396
ENV NODE_ENV=production
ENV SERVICE_PORT=3396
CMD ["index.js"]
