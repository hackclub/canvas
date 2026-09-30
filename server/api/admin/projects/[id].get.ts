import { desc, eq } from 'drizzle-orm'

// GET /api/admin/projects/:id — any project, with its owner and ships
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
            hackatimeId: schema.users.hackatimeId,
          },
        })
        .from(schema.projects)
        .innerJoin(schema.users, eq(schema.users.id, schema.projects.userId))
        .where(eq(schema.projects.id, id))
    : []
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  // Newest first, with who reviewed each one
  const ships = await useDB()
    .select({
      id: schema.ships.id,
      status: schema.ships.status,
      feedback: schema.ships.feedback,
      createdAt: schema.ships.createdAt,
      reviewedAt: schema.ships.reviewedAt,
      reviewer: { id: schema.users.id, identity: schema.users.identity },
    })
    .from(schema.ships)
    .leftJoin(schema.users, eq(schema.users.id, schema.ships.reviewerId))
    .where(eq(schema.ships.projectId, id))
    .orderBy(desc(schema.ships.createdAt))

  return { ...row.project, owner: row.owner, ships }
})
