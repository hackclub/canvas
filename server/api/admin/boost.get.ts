import { eq } from 'drizzle-orm'

// GET /api/admin/boost — when the admin's own double pixels deal ends, null if it's off.
// For trying it out from the flows page.
export default defineEventHandler(async (event) => {
  const { user } = await requireAdmin(event)
  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { shipBoostUntil: true },
  })
  const until = row?.shipBoostUntil
  return { until: until && until.getTime() > Date.now() ? until.toISOString() : null }
})
