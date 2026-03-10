FROM node:20-slim
WORKDIR /app
COPY shared/ ./shared/
COPY services/analytics/package*.json ./services/analytics/
RUN cd services/analytics && npm ci --production
COPY services/analytics/ ./services/analytics/
COPY src/ ./src/
ENV NODE_ENV=production SERVICE_NAME=analytics SERVICE_PORT=3362
RUN groupadd -r heady && useradd -r -g heady heady && chown -R heady:heady /app
USER heady
EXPOSE 3362
CMD ["node", "services/analytics/index.js"]
