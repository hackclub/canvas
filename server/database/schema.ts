// Define tables here, then run `pnpm db:generate` + `pnpm db:migrate` (or `pnpm db:push`)
// to apply them. See server/api/db.get.ts for query examples.
import { pgTable, text } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  // Hack Club Auth identity ID, e.g. "ident!abc123"
  id: text('id').primaryKey(),
})
