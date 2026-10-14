import { desc, eq } from 'drizzle-orm'

// GET /api/admin/notes?userId=… / ?projectId=… / ?orderId=… — internal notes on a user, project
// or shop order, newest first
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const target = noteTarget(event, getQuery(event))
  return useDB()
    .select({
      id: schema.adminNotes.id,
      body: schema.adminNotes.body,
      createdAt: schema.adminNotes.createdAt,
      author: { id: schema.users.id, identity: schema.users.identity },
    })
    .from(schema.adminNotes)
    .leftJoin(schema.users, eq(schema.users.id, schema.adminNotes.authorId))
    .where(noteTargetWhere(target))
    .orderBy(desc(schema.adminNotes.createdAt))
})
