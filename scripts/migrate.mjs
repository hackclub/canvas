// Applies the SQL migrations in server/database/migrations (made with `pnpm db:generate`).
// Run by the `migrate` service in compose.yaml before the app starts.
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

const client = postgres(url, { max: 1 })
await migrate(drizzle(client), { migrationsFolder: './server/database/migrations' })
await client.end()
console.log('Migrations applied')
