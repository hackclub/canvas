import { desc, eq, max } from 'drizzle-orm'

// GET /api/ships/recent — the 10 most recently approved projects, for everyone signed in
// to see. Owners are only identified by publicName() and their Slack ID (for linking to their
// Slack profile), so don't add other user columns here.
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const shippedAt = max(schema.ships.reviewedAt)
  return useDB()
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      description: schema.projects.description,
      bannerKey: schema.projects.bannerKey,
      demoUrl: schema.projects.demoUrl,
      repoUrl: schema.projects.repoUrl,
      ownerName: publicName(),
      ownerSlackId: schema.users.slackId,
      shippedAt,
    })
    .from(schema.ships)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
    .innerJoin(schema.users, eq(schema.users.id, schema.projects.userId))
    .where(eq(schema.ships.status, 'approved'))
    // One entry per project, even if it's been approved more than once
    .groupBy(schema.projects.id, schema.users.id)
    .orderBy(desc(shippedAt))
    .limit(10)
})
