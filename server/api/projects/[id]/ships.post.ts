// POST /api/projects/:id/ships — ships the project, sending it to the admin review queue.
// The project is locked from edits until the ship is reviewed.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)

  const blockers = shipBlockers(project)
  if (blockers.length) {
    throw createError({ statusCode: 400, statusMessage: `Before shipping: ${blockers.join(', ').toLowerCase()}` })
  }

  // Saved with the ship, so it's paid for the time it was shipped with, not time logged
  // while it waits in the queue
  const hackatimeSeconds = await getProjectHackatimeSeconds(user.id, project.hackatimeProjects)
  if (hackatimeSeconds === null) {
    throw createError({ statusCode: 400, statusMessage: 'Link Hackatime before shipping' })
  }

  // The partial unique index allows only one pending ship per project,
  // so nothing is returned if one's already in review
  const [ship] = await useDB()
    .insert(schema.ships)
    .values({ projectId: project.id, hackatimeSeconds })
    .onConflictDoNothing()
    .returning({
      id: schema.ships.id,
      status: schema.ships.status,
      feedback: schema.ships.feedback,
      pixelsAwarded: schema.ships.pixelsAwarded,
      bonusPointsAwarded: schema.ships.bonusPointsAwarded,
      createdAt: schema.ships.createdAt,
      reviewedAt: schema.ships.reviewedAt,
    })
  if (!ship) {
    throw createError({ statusCode: 409, statusMessage: 'This project is already being reviewed' })
  }
  setResponseStatus(event, 201)
  return ship
})
