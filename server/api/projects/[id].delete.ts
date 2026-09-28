import { eq } from 'drizzle-orm'

// DELETE /api/projects/:id
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)
  await useDB().delete(schema.projects).where(eq(schema.projects.id, project.id))
  setResponseStatus(event, 204)
})
