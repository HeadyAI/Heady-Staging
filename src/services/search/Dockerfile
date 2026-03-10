FROM node:20-slim
WORKDIR /app
COPY shared/ ./shared/
COPY services/search/package*.json ./services/search/
RUN cd services/search && npm ci --production
COPY services/search/ ./services/search/
COPY src/ ./src/
ENV NODE_ENV=production SERVICE_NAME=search SERVICE_PORT=3364
RUN groupadd -r heady && useradd -r -g heady heady && chown -R heady:heady /app
USER heady
EXPOSE 3364
CMD ["node", "services/search/index.js"]
