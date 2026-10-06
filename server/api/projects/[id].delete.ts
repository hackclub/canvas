import { eq } from 'drizzle-orm'

// DELETE /api/projects/:id
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)
  await requireNotShipping(project.id)
  if (await hasPaidShip(useDB(), project.id)) {
    throw createError({ statusCode: 409, statusMessage: "This project has been paid out for its time, so it can't be deleted" })
  }
  await useDB().delete(schema.projects).where(eq(schema.projects.id, project.id))
  if (project.bannerKey) {
    await deleteR2Object(project.bannerKey).catch((error) => console.error('Failed to delete banner:', error))
  }
  setResponseStatus(event, 204)
})
