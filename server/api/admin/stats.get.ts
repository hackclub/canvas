// GET /api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD — users, projects, hours, pixels and bonus
// points: what they are now, and their value at the end of each UTC day in the range.
// Defaults to the last 7 days.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { from, to } = parseActivityRange(event)
  return getStats(from, to)
})
