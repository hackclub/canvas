import { and, eq, ne, sql } from 'drizzle-orm'

// Pixels for finishing every item on the home page to-do list, once per user
export const TODO_REWARD_PIXELS = 50

// Where the user is on the home page to-do list
export async function userProgress(userId: string) {
  const db = useDB()
  const [user, project, onBoard, drawnBefore, shipped, ordered] = await Promise.all([
    db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { hackatime: true, todoRewardedAt: true },
    }),
    db.select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.userId, userId))
      .limit(1),
    db.select({ x: schema.canvasPixels.x })
      .from(schema.canvasPixels)
      .where(eq(schema.canvasPixels.userId, userId))
      .limit(1),
    // Their pixels could all have been drawn over since, so the log counts too
    db.select({ id: schema.pixelTransactions.id })
      .from(schema.pixelTransactions)
      .where(and(
        eq(schema.pixelTransactions.userId, userId),
        eq(schema.pixelTransactions.reason, 'canvas'),
      ))
      .limit(1),
    // Submitted for review counts, whatever the review ends up being
    db.select({ id: schema.ships.id })
      .from(schema.ships)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
      .where(eq(schema.projects.userId, userId))
      .limit(1),
    // Silly items count, rejected (refunded) orders don't
    db.select({ id: schema.shopOrders.id })
      .from(schema.shopOrders)
      .where(and(eq(schema.shopOrders.userId, userId), ne(schema.shopOrders.status, 'rejected')))
      .limit(1),
  ])
  const items = {
    hackatimeLinked: !!user?.hackatime,
    projectCreated: project.length > 0,
    drawn: onBoard.length > 0 || drawnBefore.length > 0,
    shipped: shipped.length > 0,
    ordered: ordered.length > 0,
  }
  return {
    ...items,
    allDone: Object.values(items).every(Boolean),
    rewarded: !!user?.todoRewardedAt,
  }
}

// Pays TODO_REWARD_PIXELS if they've finished the to-do list and haven't been paid for it yet.
// Returns their new pixel balance if this call paid it, null otherwise.
export async function payTodoReward(userId: string) {
  const progress = await userProgress(userId)
  if (!progress.allDone || progress.rewarded) return null

  return useDB().transaction(async (tx) => {
    // Only the request that sets todoRewardedAt gets the pixels, so parallel requests can't
    // both earn them
    const [claimed] = await tx
      .update(schema.users)
      .set({ todoRewardedAt: new Date(), pixels: sql`${schema.users.pixels} + ${TODO_REWARD_PIXELS}` })
      .where(sql`${schema.users.id} = ${userId} and ${schema.users.todoRewardedAt} is null`)
      .returning({ pixels: schema.users.pixels })
    if (!claimed) return null
    await tx.insert(schema.pixelTransactions).values({
      userId,
      amount: TODO_REWARD_PIXELS,
      balance: claimed.pixels,
      reason: 'todo',
    })
    return claimed.pixels
  })
}
