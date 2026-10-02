import { and, eq } from 'drizzle-orm'

// GET /api/me/progress — the home page's to-do items that can't be worked out from
// other routes
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const db = useDB()
  const [onBoard, drawnBefore, shipped] = await Promise.all([
    db.select({ x: schema.canvasPixels.x })
      .from(schema.canvasPixels)
      .where(eq(schema.canvasPixels.userId, user.id))
      .limit(1),
    // Their pixels could all have been drawn over since, so the log counts too
    db.select({ id: schema.pixelTransactions.id })
      .from(schema.pixelTransactions)
      .where(and(
        eq(schema.pixelTransactions.userId, user.id),
        eq(schema.pixelTransactions.reason, 'canvas'),
      ))
      .limit(1),
    // Submitted for review counts, whatever the review ends up being
    db.select({ id: schema.ships.id })
      .from(schema.ships)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
      .where(eq(schema.projects.userId, user.id))
      .limit(1),
  ])
  return {
    drawn: onBoard.length > 0 || drawnBefore.length > 0,
    shipped: shipped.length > 0,
  }
})
