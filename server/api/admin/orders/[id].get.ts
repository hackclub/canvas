import { eq } from 'drizzle-orm'

// GET /api/admin/orders/:id — one shop order with the address to send it to. The only route
// that decrypts addresses, so it must stay admin only.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const [row] = await useDB()
    .select({
      ...orderColumns,
      address: schema.shopOrders.address,
      bannerKey: schema.shopItems.bannerKey,
      user: {
        id: schema.users.id,
        identity: schema.users.identity,
        slackId: schema.users.slackId,
      },
    })
    .from(schema.shopOrders)
    .innerJoin(schema.users, eq(schema.users.id, schema.shopOrders.userId))
    .leftJoin(schema.shopItems, eq(schema.shopItems.id, schema.shopOrders.itemId))
    .where(eq(schema.shopOrders.id, getOrderId(event)))
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  // Personal info, so it shouldn't be kept by the browser or anything in between
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return { ...row, address: row.address === null ? null : decryptAddress(row.address) }
})
