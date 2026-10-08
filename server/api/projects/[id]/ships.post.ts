import { and, eq, isNotNull, max } from 'drizzle-orm'

// Time that has to be logged for a first ship, and for a ship after one that was paid
const MIN_FIRST_SHIP_SECONDS = 60 * 60
const MIN_UPDATE_SECONDS = 30 * 60

// POST /api/projects/:id/ships — ships the project, sending it to the admin review queue.
// The project is locked from edits until the ship is reviewed.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)

  if (!isEligible(await getEligibility(user.id))) {
    throw createError({ statusCode: 403, statusMessage: 'Waiting on eligibility before you can ship' })
  }

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

  // An update only counts the time since the last ship that was paid, like payShip
  const [previous] = await useDB()
    .select({ seconds: max(schema.ships.hackatimeSeconds), paid: max(schema.ships.id) })
    .from(schema.ships)
    .where(and(eq(schema.ships.projectId, project.id), isNotNull(schema.ships.pixelsAwarded)))
  const isUpdate = previous?.paid != null
  const worked = hackatimeSeconds - (previous?.seconds ?? 0)
  const required = isUpdate ? MIN_UPDATE_SECONDS : MIN_FIRST_SHIP_SECONDS
  if (worked < required) {
    const minutes = (seconds: number) => Math.floor(seconds / 60)
    throw createError({
      statusCode: 400,
      statusMessage: `${isUpdate ? 'Updates need' : 'Shipping needs'} at least ${required / 60} minutes of work${isUpdate ? ' since your last approved ship' : ''}, you have ${minutes(Math.max(0, worked))}`,
    })
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
      hackatimeSeconds: schema.ships.hackatimeSeconds,
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
