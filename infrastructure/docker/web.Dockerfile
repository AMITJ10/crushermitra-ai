FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile=false

COPY apps/web apps/web
EXPOSE 3000
CMD ["pnpm", "--filter", "@crushermitra/web", "dev"]

