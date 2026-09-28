import { eq } from 'drizzle-orm'

// GET /api/admin/projects/:id — any project, with its owner
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const [row] = Number.isSafeInteger(id)
    ? await useDB()
        .select({
          project: schema.projects,
          owner: {
            id: schema.users.id,
            identity: schema.users.identity,
            slackId: schema.users.slackId,
          },
        })
        .from(schema.projects)
        .innerJoin(schema.users, eq(schema.users.id, schema.projects.userId))
        .where(eq(schema.projects.id, id))
    : []
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }
  return { ...row.project, owner: row.owner }
})
