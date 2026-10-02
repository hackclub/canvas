import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

// GET /api/admin/audit/actions?q=&page=1 — changes made by admins, newest first.
// Searches the admin, the user it was done to, the project, the action and its details
// (e.g. ship feedback).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { q, page, offset } = getAuditQuery(event)
  const admin = alias(schema.users, 'admin')
  const target = alias(schema.users, 'target')

  const where: SQL[] = []
  if (q) {
    const pattern = `%${escapeLike(q)}%`
    where.push(or(
      userMatches(admin, q),
      userMatches(target, q),
      ilike(schema.projects.name, pattern),
      ilike(schema.adminActions.action, pattern),
      ilike(sql`${schema.adminActions.details}::text`, pattern),
    )!)
  }

  const [items, [total]] = await Promise.all([
    useDB()
      .select({
        id: schema.adminActions.id,
        action: schema.adminActions.action,
        details: schema.adminActions.details,
        createdAt: schema.adminActions.createdAt,
        admin: { id: admin.id, identity: admin.identity },
        target: { id: target.id, identity: target.identity },
        project: { id: schema.projects.id, name: schema.projects.name },
      })
      .from(schema.adminActions)
      .leftJoin(admin, eq(admin.id, schema.adminActions.adminId))
      .leftJoin(target, eq(target.id, schema.adminActions.targetUserId))
      .leftJoin(schema.projects, eq(schema.projects.id, schema.adminActions.projectId))
      .where(and(...where))
      .orderBy(desc(schema.adminActions.id))
      .limit(AUDIT_PAGE_SIZE)
      .offset(offset),
    useDB()
      .select({ count: count() })
      .from(schema.adminActions)
      .leftJoin(admin, eq(admin.id, schema.adminActions.adminId))
      .leftJoin(target, eq(target.id, schema.adminActions.targetUserId))
      .leftJoin(schema.projects, eq(schema.projects.id, schema.adminActions.projectId))
      .where(and(...where)),
  ])
  return { items, total: total!.count, page, pageSize: AUDIT_PAGE_SIZE }
})
