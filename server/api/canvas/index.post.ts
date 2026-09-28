const COLORS = new Set<number>(CANVAS_COLORS.map(hexToRgb))

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

// POST /api/canvas { pixels: [[x, y, color], ...] } — draws pixels, 1 pixel from the
// balance each. Colors are 0xRRGGBB and have to be in CANVAS_COLORS. Returns the new
// balance and any pixels that weren't drawn because the user ran out.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ pixels?: unknown }>(event)

  const list = body?.pixels
  if (!Array.isArray(list) || !list.length || list.length > CANVAS_MAX_BATCH) {
    throw badRequest(`Send between 1 and ${CANVAS_MAX_BATCH} pixels`)
  }
  const placements = list.map((item) => {
    const [x, y, color] = Array.isArray(item) ? item : []
    if (
      !Number.isInteger(x) || x < 0 || x >= CANVAS_WIDTH
      || !Number.isInteger(y) || y < 0 || y >= CANVAS_HEIGHT
    ) {
      throw badRequest('Pixel is off the canvas')
    }
    if (!COLORS.has(color)) throw badRequest("That color isn't in the palette")
    return { x, y, color }
  })

  const { rejected, balance } = await placePixels(user.id, placements)
  return {
    pixels: balance,
    rejected: rejected.map((p) => [p.x, p.y]),
  }
})
