import { desc, eq } from 'drizzle-orm'

// GET /api/admin/users/:id — one user and their projects. Never returns the Hackatime token.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const row = await useDB().query.users.findFirst({ where: eq(schema.users.id, id) })
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  const projects = await useDB().query.projects.findMany({
    where: eq(schema.projects.userId, id),
    columns: { id: true, name: true, description: true, bannerKey: true },
    orderBy: desc(schema.projects.createdAt),
  })
  const { hackatime, ...user } = row
  return { ...user, hackatimeLinked: !!hackatime, projects }
})
