import { count, eq, isNotNull } from 'drizzle-orm'

// GET /api/admin/users — every user with their project count. Never returns Hackatime tokens.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return useDB()
    .select({
      id: schema.users.id,
      identity: schema.users.identity,
      pixels: schema.users.pixels,
      isAdmin: schema.users.isAdmin,
      verificationStatus: schema.users.verificationStatus,
      yswsEligible: schema.users.yswsEligible,
      slackId: schema.users.slackId,
      hackatimeId: schema.users.hackatimeId,
      hackatimeLinked: isNotNull(schema.users.hackatime).mapWith(Boolean),
      projectCount: count(schema.projects.id),
    })
    .from(schema.users)
    .leftJoin(schema.projects, eq(schema.projects.userId, schema.users.id))
    .groupBy(schema.users.id)
    .orderBy(schema.users.id)
})
