import { sql } from 'drizzle-orm'

// GET /api/db — checks the database connection. Read-only, doesn't touch any tables.
//
// `useDB()` (server/utils/db.ts) and `schema` (server/database/schema.ts) are
// auto-imported in every server route. Some examples, assuming a `things` table
// has been added to the schema:
//
//   import { eq } from 'drizzle-orm'
//   const db = useDB()
//
//   // Select
//   const all = await db.select().from(schema.things)
//   const one = await db.query.things.findFirst({ where: eq(schema.things.id, 1) })
//
//   // Insert (`.returning()` gives back the inserted rows)
//   const [created] = await db.insert(schema.things).values({ name: 'hi' }).returning()
//
//   // Update / delete
//   await db.update(schema.things).set({ name: 'bye' }).where(eq(schema.things.id, 1))
//   await db.delete(schema.things).where(eq(schema.things.id, 1))
//
//   // Raw SQL (values in ${} are sent as parameters, so they're safe from injection)
//   const rows = await db.execute(sql`select * from things where name = ${name}`)
//
// Docs: https://orm.drizzle.team/docs/overview
export default defineEventHandler(async () => {
  try {
    const [row] = await useDB().execute<{ now: string }>(sql`select now() as now`)
    return { database: 'up', time: row?.now }
  } catch (error) {
    console.error('Database check failed:', error)
    throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })
  }
})
