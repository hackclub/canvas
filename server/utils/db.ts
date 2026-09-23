import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

export { schema }

let db: ReturnType<typeof drizzle<typeof schema>> | undefined

// Lazily creates a single shared connection pool for the server process
export function useDB() {
  if (!db) {
    const { databaseUrl } = useRuntimeConfig()
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set')
    }
    db = drizzle(postgres(databaseUrl), { schema })
  }
  return db
}
