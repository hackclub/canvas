import { eq } from 'drizzle-orm'

// DELETE /api/projects/:id/banner — removes the project's banner
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)

  const [updated] = await useDB()
    .update(schema.projects)
    .set({ bannerKey: null, updatedAt: new Date() })
    .where(eq(schema.projects.id, project.id))
    .returning()

  if (project.bannerKey) {
    await deleteR2Object(project.bannerKey).catch((error) => console.error('Failed to delete banner:', error))
  }
  return updated
})
