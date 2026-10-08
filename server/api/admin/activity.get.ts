// GET /api/admin/activity?from=YYYY-MM-DD&to=YYYY-MM-DD — active users per day and per hour
// (UTC), plus the total number of users. Defaults to the last 7 days.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { from, to } = parseActivityRange(event)
  return getActivity(from, to)
})
