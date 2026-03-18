FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --production 2>/dev/null || true
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
