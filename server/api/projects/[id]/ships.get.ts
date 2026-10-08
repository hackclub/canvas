import { desc, eq } from 'drizzle-orm'

// GET /api/projects/:id/ships — the project's ships, newest first
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)
  return useDB().query.ships.findMany({
    where: eq(schema.ships.projectId, project.id),
    columns: {
      id: true,
      status: true,
      feedback: true,
      hackatimeSeconds: true,
      pixelsAwarded: true,
      bonusPointsAwarded: true,
      createdAt: true,
      reviewedAt: true,
    },
    orderBy: desc(schema.ships.createdAt),
  })
})
