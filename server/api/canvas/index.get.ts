// GET /api/canvas — the whole board as raw RGB bytes (3 per pixel, row by row,
// CANVAS_WIDTH x CANVAS_HEIGHT). Pair with /api/canvas/stream for live updates.
export default defineEventHandler(async (event) => {
  const gzip = /\bgzip\b/.test(getRequestHeader(event, 'accept-encoding') ?? '')
  const body = await getCanvasSnapshot(gzip)

  setResponseHeaders(event, {
    'content-type': 'application/octet-stream',
    'cache-control': 'no-store',
    'vary': 'accept-encoding',
    ...(gzip && { 'content-encoding': 'gzip' }),
  })
  return body
})
