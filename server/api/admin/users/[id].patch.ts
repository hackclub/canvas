import { and, eq, gte, lte, sql, type SQL } from 'drizzle-orm'

// Postgres `integer` tops out at 2,147,483,647
const MAX_BALANCE = 2_000_000_000

// "set" replaces the balance, "add" changes it by `amount` (negative to take some away)
interface BalanceChange {
  op: 'set' | 'add'
  amount: number
}

interface Body {
  pixels?: BalanceChange
  bonusPoints?: BalanceChange
  isAdmin?: boolean
  canvasBanned?: boolean
}

// The balances admins can change, with how they're named in errors and logged
const BALANCES = [
  { field: 'pixels', label: 'Pixels', action: 'user.pixels', transactions: schema.pixelTransactions },
  { field: 'bonusPoints', label: 'Bonus points', action: 'user.bonusPoints', transactions: schema.bonusPointTransactions },
] as const

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

// PATCH /api/admin/users/:id — change a user's pixels, bonus points, admin status and/or canvas ban
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody<Body>(event)

  const set: { pixels?: number | SQL, bonusPoints?: number | SQL, isAdmin?: boolean, canvasBanned?: boolean } = {}
  const where = [eq(schema.users.id, id)]
  const changed = BALANCES.filter(({ field }) => body?.[field] !== undefined)

  for (const { field, label } of changed) {
    const { op, amount } = body[field]!
    if (!Number.isInteger(amount) || Math.abs(amount) > MAX_BALANCE) {
      throw badRequest(`${label} must be a whole number`)
    }
    const column = schema.users[field]
    if (op === 'set') {
      if (amount < 0) throw badRequest(`${label} can't be negative`)
      set[field] = amount
    } else if (op === 'add') {
      // Done in SQL so two admins changing the balance at once can't overwrite each other
      set[field] = sql`${column} + ${amount}`
      // Checked as bigint so going over the integer limit is a 400, not a Postgres overflow error
      const newBalance = sql`${column}::bigint + ${amount}`
      where.push(gte(newBalance, 0), lte(newBalance, MAX_BALANCE))
    } else {
      throw badRequest(`${label} op must be "set" or "add"`)
    }
  }

  if (body?.isAdmin !== undefined) {
    if (typeof body.isAdmin !== 'boolean') throw badRequest('isAdmin must be true or false')
    // Stops admins from accidentally locking themselves out
    if (id === me.id && !body.isAdmin) throw badRequest("You can't remove your own admin status")
    set.isAdmin = body.isAdmin
  }

  if (body?.canvasBanned !== undefined) {
    if (typeof body.canvasBanned !== 'boolean') throw badRequest('canvasBanned must be true or false')
    set.canvasBanned = body.canvasBanned
  }

  if (!Object.keys(set).length) throw badRequest('Nothing to change')

  const columns = {
    pixels: schema.users.pixels,
    bonusPoints: schema.users.bonusPoints,
    isAdmin: schema.users.isAdmin,
    canvasBanned: schema.users.canvasBanned,
  }

  return useDB().transaction(async (tx) => {
    // Locked so the audit log gets exactly what the balances were before the change
    const [before] = await tx
      .select(columns)
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .for('update')
    if (!before) throw createError({ statusCode: 404, statusMessage: 'User not found' })

    const [updated] = await tx
      .update(schema.users)
      .set(set)
      .where(and(...where))
      .returning(columns)
    if (!updated) {
      // e.g. "Pixels and bonus points"
      const labels = changed.map(({ label }, i) => (i ? label.toLowerCase() : label)).join(' and ')
      throw badRequest(`${labels || 'Balances'} have to stay between 0 and ${MAX_BALANCE.toLocaleString()}`)
    }

    for (const { field, action, transactions } of changed) {
      if (updated[field] === before[field]) continue
      await tx.insert(transactions).values({
        userId: id,
        amount: updated[field] - before[field],
        balance: updated[field],
        reason: 'admin',
        actorId: me.id,
      })
      await logAdminAction(tx, me.id, {
        action,
        details: {
          op: body[field]!.op,
          amount: body[field]!.amount,
          before: before[field],
          after: updated[field],
        },
      }, { userId: id })
    }
    if (updated.isAdmin !== before.isAdmin) {
      await logAdminAction(tx, me.id, {
        action: 'user.admin',
        details: { isAdmin: updated.isAdmin },
      }, { userId: id })
    }
    if (updated.canvasBanned !== before.canvasBanned) {
      await logAdminAction(tx, me.id, {
        action: 'user.canvasBan',
        details: { banned: updated.canvasBanned },
      }, { userId: id })
    }
    return updated
  })
})
