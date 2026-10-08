FROM node:24-alpine AS base
RUN npm install -g pnpm@12.9.1
WORKDIR /app

# All dependencies, for building
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# postinstall runs `nuxt prepare`, which needs the sources, so it's skipped here
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN pnpm exec nuxt prepare && pnpm build

# The app: Nitro's self-contained output, with no node_modules
FROM node:24-alpine AS app
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/.output ./.output
# Applied when the server starts (server/plugins/migrate.ts), from the working directory
COPY server/database/migrations ./server/database/migrations
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
