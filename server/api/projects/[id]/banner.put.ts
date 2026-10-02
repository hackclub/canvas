import { eq } from 'drizzle-orm'

// PUT /api/projects/:id/banner (multipart, `banner` file field) — sets the project's banner.
// The upload is re-encoded to WebP (see readBannerUpload).
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)
  await requireNotShipping(project.id)

  const image = await readBannerUpload(event)

  // A fresh key per upload, so /images/<key> can be cached forever
  const key = `banners/${project.id}/${crypto.randomUUID()}.webp`
  await putR2Object(key, image, 'image/webp')

  const [updated] = await useDB()
    .update(schema.projects)
    .set({ bannerKey: key, updatedAt: new Date() })
    .where(eq(schema.projects.id, project.id))
    .returning()

  if (project.bannerKey) {
    await deleteR2Object(project.bannerKey).catch((error) => console.error('Failed to delete old banner:', error))
  }
  return updated
})
