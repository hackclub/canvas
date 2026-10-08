# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Docker

`compose.yaml` runs Postgres, applies the migrations, then starts the app:

```bash
cp .env.example .env   # fill it in, including POSTGRES_PASSWORD, NUXT_SESSION_PASSWORD and TOKEN_ENCRYPTION_KEY
docker compose up -d --build
```

The app is on `http://localhost:${APP_PORT:-3000}`. Set `SITE_URL` to the public origin when deploying.
Run a single copy of the app, the canvas is kept in memory.

Schema changes need a migration for the container: `pnpm db:generate`, and commit the result
in `server/database/migrations`. The `migrate` service applies them on every `up`. (In development,
`pnpm db:push` is still fine, but don't run the migrations against a database made with it.)
