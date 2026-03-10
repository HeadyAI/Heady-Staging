FROM node:20-slim
WORKDIR /app
COPY shared/ ./shared/
COPY services/scheduler/package*.json ./services/scheduler/
RUN cd services/scheduler && npm ci --production
COPY services/scheduler/ ./services/scheduler/
COPY src/ ./src/
ENV NODE_ENV=production SERVICE_NAME=scheduler SERVICE_PORT=3363
RUN groupadd -r heady && useradd -r -g heady heady && chown -R heady:heady /app
USER heady
EXPOSE 3363
CMD ["node", "services/scheduler/index.js"]
