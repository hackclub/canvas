// POST /api/admin/shop { name, description, price, stock, showInApp?, showOnLanding?, showQuantity?, perUserLimit?,
// checkoutLimit?, checkoutLimitEnabled?, disclaimer?, silly?, requirePhone?, pixels?, fields? } — adds a shop item.
// The banner is uploaded separately, with PUT /api/admin/shop/:id/banner.
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const input = parseShopItem(await readBody(event))
  checkPixelItem(input)

  const item = await useDB().transaction(async (tx) => {
    const [item] = await tx.insert(schema.shopItems).values(input).returning()
    await logAdminAction(tx, me.id, {
      action: 'shop.create',
      details: { itemId: item!.id, name: item!.name },
    })
    return item!
  })
  setResponseStatus(event, 201)
  return item
})
