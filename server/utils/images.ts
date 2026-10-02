import type { H3Event } from 'h3'
import sharp from 'sharp'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
// Big enough for a full-width banner on large screens
const MAX_SIZE = 1920
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif'])

function tooLarge() {
  return createError({ statusCode: 413, statusMessage: 'Images can be at most 10 MB' })
}

// Reads the `banner` file field of a multipart upload and re-encodes it to WebP, which
// strips metadata like EXIF location and means only images we generated are ever served.
export async function readBannerUpload(event: H3Event) {
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

  try {
    const input = sharp(file.data, { limitInputPixels: 50_000_000 })
    // Checked by decoding, not by file extension or the browser-supplied type
    const { format } = await input.metadata()
    if (!format || !ALLOWED_FORMATS.has(format)) {
      throw new Error(`Unsupported format: ${format}`)
    }
    return await input
      .rotate() // apply EXIF orientation before the metadata is dropped
      .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Banners must be a JPEG, PNG, WebP, GIF or AVIF image' })
  }
}
