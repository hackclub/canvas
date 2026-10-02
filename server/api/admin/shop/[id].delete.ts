import { eq } from 'drizzle-orm'

// DELETE /api/admin/shop/:id — removes a shop item and its banner
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const item = await requireShopItem(event)

  await useDB().transaction(async (tx) => {
    await tx.delete(schema.shopItems).where(eq(schema.shopItems.id, item.id))
    await logAdminAction(tx, me.id, {
      action: 'shop.delete',
      details: { itemId: item.id, name: item.name },
    })
  })
  if (item.bannerKey) {
    await deleteR2Object(item.bannerKey).catch((error) => console.error('Failed to delete banner:', error))
  }
  setResponseStatus(event, 204)
})
