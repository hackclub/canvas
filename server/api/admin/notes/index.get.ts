import { desc, eq } from 'drizzle-orm'

// GET /api/admin/notes?userId=… or ?projectId=… — internal notes on a user or project, newest first
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { userId, projectId } = noteTarget(event, getQuery(event))
  return useDB()
    .select({
      id: schema.adminNotes.id,
      body: schema.adminNotes.body,
      createdAt: schema.adminNotes.createdAt,
      author: { id: schema.users.id, identity: schema.users.identity },
    })
    .from(schema.adminNotes)
    .leftJoin(schema.users, eq(schema.users.id, schema.adminNotes.authorId))
    .where(userId !== null ? eq(schema.adminNotes.userId, userId) : eq(schema.adminNotes.projectId, projectId!))
    .orderBy(desc(schema.adminNotes.createdAt))
})
