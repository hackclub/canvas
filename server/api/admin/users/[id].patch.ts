import { and, eq, gte, lte, sql, type SQL } from 'drizzle-orm'

// Postgres `integer` tops out at 2,147,483,647
const MAX_PIXELS = 2_000_000_000

interface Body {
  // "set" replaces the balance, "add" changes it by `amount` (negative to take pixels away)
  pixels?: { op: 'set' | 'add', amount: number }
  isAdmin?: boolean
}

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

// PATCH /api/admin/users/:id — change a user's pixels and/or admin status
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody<Body>(event)

  const set: { pixels?: number | SQL, isAdmin?: boolean } = {}
  const where = [eq(schema.users.id, id)]

  if (body?.pixels !== undefined) {
    const { op, amount } = body.pixels
    if (!Number.isInteger(amount) || Math.abs(amount) > MAX_PIXELS) {
      throw badRequest('Pixels must be a whole number')
    }
    if (op === 'set') {
      if (amount < 0) throw badRequest("Pixels can't be negative")
      set.pixels = amount
    } else if (op === 'add') {
      // Done in SQL so two admins changing the balance at once can't overwrite each other
      set.pixels = sql`${schema.users.pixels} + ${amount}`
      // Checked as bigint so going over the integer limit is a 400, not a Postgres overflow error
      const newBalance = sql`${schema.users.pixels}::bigint + ${amount}`
      where.push(gte(newBalance, 0), lte(newBalance, MAX_PIXELS))
    } else {
      throw badRequest('Pixels op must be "set" or "add"')
    }
  }

  if (body?.isAdmin !== undefined) {
    if (typeof body.isAdmin !== 'boolean') throw badRequest('isAdmin must be true or false')
    // Stops admins from accidentally locking themselves out
    if (id === me.id && !body.isAdmin) throw badRequest("You can't remove your own admin status")
    set.isAdmin = body.isAdmin
  }

  if (!Object.keys(set).length) throw badRequest('Nothing to change')

  const [updated] = await useDB()
    .update(schema.users)
    .set(set)
    .where(and(...where))
    .returning({ pixels: schema.users.pixels, isAdmin: schema.users.isAdmin })

  if (!updated) {
    const exists = await useDB().query.users.findFirst({
      where: eq(schema.users.id, id),
      columns: { id: true },
    })
    if (!exists) throw createError({ statusCode: 404, statusMessage: 'User not found' })
    throw badRequest(`Pixels have to stay between 0 and ${MAX_PIXELS.toLocaleString()}`)
  }
  return updated
})
