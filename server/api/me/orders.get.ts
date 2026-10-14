import { desc, eq } from 'drizzle-orm'

// GET /api/me/orders — the signed-in user's shop orders, newest first. Never includes the
// address (see orderColumns).
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return useDB()
    .select({ ...orderColumns, bannerKey: schema.shopItems.bannerKey })
    .from(schema.shopOrders)
    .leftJoin(schema.shopItems, eq(schema.shopItems.id, schema.shopOrders.itemId))
    .where(eq(schema.shopOrders.userId, user.id))
    .orderBy(desc(schema.shopOrders.createdAt), desc(schema.shopOrders.id))
})
