FROM node:22-slim AS builder
WORKDIR /build
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY . .

FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
COPY --from=builder /build /app
EXPOSE 3321
ENV NODE_ENV=production
ENV PORT=3321
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://localhost:3321/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["index.js"]
