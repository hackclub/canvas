// GET /api/projects/:id — one of the signed-in user's projects
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return requireOwnProject(event, user.id)
})
