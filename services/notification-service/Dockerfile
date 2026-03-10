FROM node:22-slim AS builder
WORKDIR /build
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY . .

FROM node:22-slim AS shared-builder
WORKDIR /shared
COPY ../../shared/ ./

FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
COPY --from=builder /build /app
COPY --from=shared-builder /shared /app/shared
EXPOSE 3395
ENV NODE_ENV=production
ENV SERVICE_PORT=3395
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://localhost:3395/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["index.js"]
