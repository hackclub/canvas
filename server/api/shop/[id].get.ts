import { and, eq, ne, sum } from 'drizzle-orm'

// GET /api/shop/:id — one shop item for its checkout page, with the signed-in user's bonus
// points and how many of it they've already ordered (not counting rejected orders)
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const item = await requireShopItem(event)
  const [me, [ordered]] = await Promise.all([
    useDB().query.users.findFirst({
      where: eq(schema.users.id, user.id),
      columns: { bonusPoints: true },
    }),
    useDB()
      .select({ quantity: sum(schema.shopOrders.quantity).mapWith(Number) })
      .from(schema.shopOrders)
      .where(and(
        eq(schema.shopOrders.userId, user.id),
        eq(schema.shopOrders.itemId, item.id),
        ne(schema.shopOrders.status, 'rejected'),
      )),
  ])
  return {
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      bannerKey: item.bannerKey,
      price: item.price,
      stock: item.stock,
      showQuantity: item.showQuantity,
      perUserLimit: item.perUserLimit,
      checkoutLimit: item.checkoutLimitEnabled ? item.checkoutLimit : null,
      disclaimer: item.disclaimer,
      silly: item.silly,
      requirePhone: item.requirePhone,
      fields: item.fields,
    },
    bonusPoints: me?.bonusPoints ?? 0,
    ordered: ordered?.quantity ?? 0,
  }
})
