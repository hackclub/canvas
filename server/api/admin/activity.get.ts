// GET /api/admin/activity?from=YYYY-MM-DD&to=YYYY-MM-DD — active users per day and per hour
// (UTC), plus the total number of users. Defaults to the last 7 days.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  const parseDay = (v: unknown) => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
    const d = new Date(`${v}T00:00:00Z`)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  const to = parseDay(query.to) ?? today
  const from = parseDay(query.from) ?? new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000)

  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000) + 1
  if (days < 1 || days > ACTIVITY_MAX_DAYS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Pick a range of 1 to ${ACTIVITY_MAX_DAYS} days`,
    })
  }

  return getActivity(from, to)
})
