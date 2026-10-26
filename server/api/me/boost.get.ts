import { and, desc, eq, lt } from 'drizzle-orm'

// GET /api/me/boost — the ship boost from the "you haven't started yet" DM, for the banner:
// when it ends and the project to ship. Null once it's over, used up by an approved ship
// (which clears it), or while a ship made in time is waiting for review, since that one gets it.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  // Can't ship to use it
  if (useRuntimeConfig().public.shipsClosed) return null
  const db = useDB()
  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { shipBoostUntil: true },
  })
  const until = row?.shipBoostUntil
  if (!until || until.getTime() <= Date.now()) return null

  const [[waiting], project] = await Promise.all([
    db.select({ id: schema.ships.id }).from(schema.ships)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
      .where(and(
        eq(schema.projects.userId, user.id),
        eq(schema.ships.status, 'pending'),
        lt(schema.ships.createdAt, until),
      ))
      .limit(1),
    db.query.projects.findFirst({
      where: eq(schema.projects.userId, user.id),
      columns: { id: true },
      orderBy: desc(schema.projects.updatedAt),
    }),
  ])
  if (waiting) return null
  return { until: until.toISOString(), projectId: project?.id ?? null, maxExtra: SHIP_BOOST_MAX }
})
