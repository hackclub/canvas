// POST /api/me/coding — pays pixels for newly coded Hackatime hours and returns the
// user's progress towards the next one. `null` if Hackatime isn't linked.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return syncCodingPixels(user.id)
})
