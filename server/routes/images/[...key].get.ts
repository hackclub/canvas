// GET /images/<key> — serves uploaded images from R2, so the bucket doesn't need to be public.
// Only keys in the format the upload routes create are served.
// banners/<project ID>/... for projects, shop/<item ID>/... for shop items
const KEY_PATTERN = /^(banners|shop)\/\d+\/[0-9a-f-]{36}\.webp$/

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') ?? ''
  const object = KEY_PATTERN.test(key) ? await getR2Object(key) : null
  if (!object?.body) {
    throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  }

  setResponseHeaders(event, {
    'Content-Type': 'image/webp',
    // Keys are never reused, so the image behind a URL never changes
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  })
  return sendStream(event, object.body)
})
