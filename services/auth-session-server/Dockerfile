FROM node:22-bookworm-slim
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate && pnpm install --frozen-lockfile=false
RUN pnpm --filter @heady/auth-session-server build
CMD ["pnpm", "--filter", "@heady/auth-session-server", "start"]
