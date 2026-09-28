import { eq } from 'drizzle-orm'
import sharp from 'sharp'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
// Big enough for a full-width banner on large screens
const MAX_SIZE = 1920
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif'])

function tooLarge() {
  return createError({ statusCode: 413, statusMessage: 'Images can be at most 10 MB' })
}

// PUT /api/projects/:id/banner (multipart, `banner` file field) — sets the project's banner.
// The upload is re-encoded to WebP, which strips metadata like EXIF location and
// means only images we generated are ever served.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)

  if (Number(getRequestHeader(event, 'content-length')) > MAX_UPLOAD_BYTES) {
    throw tooLarge()
  }
  const file = (await readMultipartFormData(event))?.find((part) => part.name === 'banner' && part.filename)
  if (!file) {
    throw createError({ statusCode: 400, statusMessage: 'No image uploaded' })
  }
  if (file.data.length > MAX_UPLOAD_BYTES) {
    throw tooLarge()
  }

  let image: Buffer
  try {
    const input = sharp(file.data, { limitInputPixels: 50_000_000 })
    // Checked by decoding, not by file extension or the browser-supplied type
    const { format } = await input.metadata()
    if (!format || !ALLOWED_FORMATS.has(format)) {
      throw new Error(`Unsupported format: ${format}`)
    }
    image = await input
      .rotate() // apply EXIF orientation before the metadata is dropped
      .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Banners must be a JPEG, PNG, WebP, GIF or AVIF image' })
  }

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
