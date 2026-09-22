# syntax=docker/dockerfile:1
FROM node:22-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY . .

RUN corepack enable \
  && corepack prepare pnpm@10.32.0 --activate \
  && pnpm install --frozen-lockfile \
  && pnpm run build

CMD ["pnpm", "run", "docker-start"]
