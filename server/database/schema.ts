// Define tables here, then run `pnpm db:generate` + `pnpm db:migrate` (or `pnpm db:push`)
// to apply them. See server/api/db.get.ts for query examples.
import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'

// Profile from Hack Club Auth, refreshed on every sign-in
export interface UserIdentity {
  first_name?: string
  last_name?: string
}

// Linked Hackatime account, set by /auth/hackatime
export interface UserHackatime {
  access_token: string
  // When Hackatime issued the token (ISO 8601)
  created_at: string
}

export const users = pgTable('users', {
  // Hack Club Auth identity ID, e.g. "ident!abc123"
  id: text('id').primaryKey(),
  identity: jsonb('identity').$type<UserIdentity>().notNull().default({}),
  hackatime: jsonb('hackatime').$type<UserHackatime>(),
})
