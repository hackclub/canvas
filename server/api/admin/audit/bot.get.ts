import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

// GET /api/admin/audit/bot?q=&kind=message|boost&page=1 — Slack DMs the bot sent (or failed
// to) and double pixels deals turned on or off, newest first. Searches the user, the admin
// who did it, and the details (e.g. the message's text or type).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { query, q, page, offset } = getAuditQuery(event)
  const recipient = alias(schema.users, 'recipient')
  const actor = alias(schema.users, 'actor')

  const where: SQL[] = []
  if (query.kind === 'message' || query.kind === 'boost') where.push(eq(schema.botLog.kind, query.kind))
  if (q) {
    where.push(or(
      userMatches(recipient, q),
      userMatches(actor, q),
      ilike(sql`${schema.botLog.details}::text`, `%${escapeLike(q)}%`),
    )!)
  }

  const [items, [total]] = await Promise.all([
    useDB()
      .select({
        id: schema.botLog.id,
        kind: schema.botLog.kind,
        details: schema.botLog.details,
        createdAt: schema.botLog.createdAt,
        user: { id: recipient.id, identity: recipient.identity },
        actor: { id: actor.id, identity: actor.identity },
      })
      .from(schema.botLog)
      .leftJoin(recipient, eq(recipient.id, schema.botLog.userId))
      .leftJoin(actor, eq(actor.id, schema.botLog.actorId))
      .where(and(...where))
      .orderBy(desc(schema.botLog.id))
      .limit(AUDIT_PAGE_SIZE)
      .offset(offset),
    useDB()
      .select({ count: count() })
      .from(schema.botLog)
      .leftJoin(recipient, eq(recipient.id, schema.botLog.userId))
      .leftJoin(actor, eq(actor.id, schema.botLog.actorId))
      .where(and(...where)),
  ])
  return { items, total: total!.count, page, pageSize: AUDIT_PAGE_SIZE }
})
