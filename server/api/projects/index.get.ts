import { desc, eq } from 'drizzle-orm'

// GET /api/projects — the signed-in user's projects, newest first
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return useDB().query.projects.findMany({
    where: eq(schema.projects.userId, user.id),
    columns: { id: true, name: true, description: true, bannerKey: true },
    orderBy: desc(schema.projects.createdAt),
  })
})
