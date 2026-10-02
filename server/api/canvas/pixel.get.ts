import { and, eq } from 'drizzle-orm'

// GET /api/canvas/pixel?x=&y= — who last drew on a pixel and when, or null if nobody has.
// The drawer is only identified by publicName() and their Slack ID (for linking to their
// Slack profile), so don't add other user columns here.
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const query = getQuery(event)
  const x = Number(query.x)
  const y = Number(query.y)
  if (
    !Number.isInteger(x) || x < 0 || x >= CANVAS_WIDTH
    || !Number.isInteger(y) || y < 0 || y >= CANVAS_HEIGHT
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Pixel is off the canvas' })
  }

  const [row] = await useDB()
    .select({
      placedAt: schema.canvasPixels.placedAt,
      name: publicName(),
      slackId: schema.users.slackId,
    })
    .from(schema.canvasPixels)
    .leftJoin(schema.users, eq(schema.users.id, schema.canvasPixels.userId))
    .where(and(eq(schema.canvasPixels.x, x), eq(schema.canvasPixels.y, y)))
  return row ?? null
})
