import { asc, desc, eq } from 'drizzle-orm'

// GET /api/admin/orders?status=pending — shop orders with who placed them, without addresses
// (those are only on GET /api/admin/orders/:id). Pending orders come oldest first so they're
// sent out first come, first served; the rest come most recently changed first.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { status = 'pending' } = getQuery(event)
  if (!ORDER_STATUSES.has(status as OrderStatus)) {
    throw createError({ statusCode: 400, statusMessage: 'Status must be pending, fulfilled or rejected' })
  }

  return useDB()
    .select({
      ...orderColumns,
      bannerKey: schema.shopItems.bannerKey,
      user: { id: schema.users.id, identity: schema.users.identity },
    })
    .from(schema.shopOrders)
    .innerJoin(schema.users, eq(schema.users.id, schema.shopOrders.userId))
    .leftJoin(schema.shopItems, eq(schema.shopItems.id, schema.shopOrders.itemId))
    .where(eq(schema.shopOrders.status, status as OrderStatus))
    .orderBy(status === 'pending' ? asc(schema.shopOrders.createdAt) : desc(schema.shopOrders.updatedAt))
})
