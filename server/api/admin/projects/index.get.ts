import { desc, eq } from 'drizzle-orm'

// GET /api/admin/projects — every project with its owner, newest first
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return useDB()
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      description: schema.projects.description,
      bannerKey: schema.projects.bannerKey,
      createdAt: schema.projects.createdAt,
      owner: { id: schema.users.id, identity: schema.users.identity },
    })
    .from(schema.projects)
    .innerJoin(schema.users, eq(schema.users.id, schema.projects.userId))
    .orderBy(desc(schema.projects.createdAt))
})
