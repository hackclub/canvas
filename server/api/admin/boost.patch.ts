import { eq } from 'drizzle-orm'

// PATCH /api/admin/boost — turns the admin's own double pixels deal on (until the day after
// tomorrow, like the nudge DM gives) or off, without a DM. Only ever their own account.
export default defineEventHandler(async (event) => {
  const { user } = await requireAdmin(event)
  const body = await readBody<{ enabled?: unknown }>(event)
  if (typeof body?.enabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'enabled must be true or false' })
  }
  if (!body.enabled) {
    await disableShipBoost(user.id, user.id)
    return { until: null }
  }
  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { slackId: true },
  })
  const { until } = await enableShipBoost({ id: user.id, slackId: row?.slackId ?? null }, 'admin', user.id)
  return { until: until.toISOString() }
})
