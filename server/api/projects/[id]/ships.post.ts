// POST /api/projects/:id/ships — ships the project, sending it to the admin review queue.
// The project is locked from edits until the ship is reviewed.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)

  const blockers = shipBlockers(project)
  if (blockers.length) {
    throw createError({ statusCode: 400, statusMessage: `Before shipping: ${blockers.join(', ').toLowerCase()}` })
  }

  // The partial unique index allows only one pending ship per project,
  // so nothing is returned if one's already in review
  const [ship] = await useDB()
    .insert(schema.ships)
    .values({ projectId: project.id })
    .onConflictDoNothing()
    .returning({
      id: schema.ships.id,
      status: schema.ships.status,
      feedback: schema.ships.feedback,
      createdAt: schema.ships.createdAt,
      reviewedAt: schema.ships.reviewedAt,
    })
  if (!ship) {
    throw createError({ statusCode: 409, statusMessage: 'This project is already being reviewed' })
  }
  setResponseStatus(event, 201)
  return ship
})
