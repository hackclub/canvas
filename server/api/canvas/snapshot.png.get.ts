// GET /api/canvas/snapshot.png — the canvas as a PNG, a few minutes behind. For the landing
// page, which shouldn't use the live canvas (the stream and /api/canvas). Public.
export default defineEventHandler(async (event) => {
  const body = await getCanvasPng()
  setResponseHeaders(event, {
    'content-type': 'image/png',
    // Browsers and CDNs can hold on to it for as long as the server does
    'cache-control': `public, max-age=${PNG_MAX_AGE_SECONDS}`,
  })
  return body
})
