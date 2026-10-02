import { and, count, desc, eq, gt, ilike, lt, or, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

// GET /api/admin/audit/bonus?q=&direction=increased|decreased&page=1 — bonus point balance
// changes, newest first. Searches the user, the admin who made the change, the reason and
// the project of the ship that paid it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { query, q, page, offset } = getAuditQuery(event)
  const actor = alias(schema.users, 'actor')

  const where: SQL[] = []
  if (query.direction === 'increased') where.push(gt(schema.bonusPointTransactions.amount, 0))
  if (query.direction === 'decreased') where.push(lt(schema.bonusPointTransactions.amount, 0))
  if (q) {
    where.push(or(
      userMatches(schema.users, q),
      userMatches(actor, q),
      ilike(schema.bonusPointTransactions.reason, `%${escapeLike(q)}%`),
      ilike(schema.projects.name, `%${escapeLike(q)}%`),
    )!)
  }

  const [items, [total]] = await Promise.all([
    useDB()
      .select({
        id: schema.bonusPointTransactions.id,
        amount: schema.bonusPointTransactions.amount,
        balance: schema.bonusPointTransactions.balance,
        reason: schema.bonusPointTransactions.reason,
        createdAt: schema.bonusPointTransactions.createdAt,
        user: { id: schema.users.id, identity: schema.users.identity },
        actor: { id: actor.id, identity: actor.identity },
        project: { id: schema.projects.id, name: schema.projects.name },
      })
      .from(schema.bonusPointTransactions)
      .innerJoin(schema.users, eq(schema.users.id, schema.bonusPointTransactions.userId))
      .leftJoin(actor, eq(actor.id, schema.bonusPointTransactions.actorId))
      .leftJoin(schema.ships, eq(schema.ships.id, schema.bonusPointTransactions.shipId))
      .leftJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
      .where(and(...where))
      .orderBy(desc(schema.bonusPointTransactions.id))
      .limit(AUDIT_PAGE_SIZE)
      .offset(offset),
    useDB()
      .select({ count: count() })
      .from(schema.bonusPointTransactions)
      .innerJoin(schema.users, eq(schema.users.id, schema.bonusPointTransactions.userId))
      .leftJoin(actor, eq(actor.id, schema.bonusPointTransactions.actorId))
      .leftJoin(schema.ships, eq(schema.ships.id, schema.bonusPointTransactions.shipId))
      .leftJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
      .where(and(...where)),
  ])
  return { items, total: total!.count, page, pageSize: AUDIT_PAGE_SIZE }
})
