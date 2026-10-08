FROM node:24-alpine AS base
RUN npm install -g pnpm@12.9.1
WORKDIR /app

# All dependencies, for building and for running migrations
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# postinstall runs `nuxt prepare`, which needs the sources, so it's skipped here
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN pnpm exec nuxt prepare && pnpm build

# Applies database migrations, then exits (the `migrate` service)
FROM deps AS migrate
COPY drizzle.config.ts ./
COPY scripts ./scripts
COPY server/database ./server/database
CMD ["node", "scripts/migrate.mjs"]

# The app: Nitro's self-contained output, with no node_modules
FROM node:24-alpine AS app
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
