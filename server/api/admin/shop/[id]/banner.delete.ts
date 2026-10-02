import { eq } from 'drizzle-orm'

// DELETE /api/admin/shop/:id/banner — removes the item's banner
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const item = await requireShopItem(event)
  if (!item.bannerKey) return item

  const updated = await useDB().transaction(async (tx) => {
    const [updated] = await tx
      .update(schema.shopItems)
      .set({ bannerKey: null, updatedAt: new Date() })
      .where(eq(schema.shopItems.id, item.id))
      .returning()
    await logAdminAction(tx, me.id, {
      action: 'shop.update',
      details: { itemId: item.id, name: item.name, changes: ['banner'] },
    })
    return updated
  })

  await deleteR2Object(item.bannerKey).catch((error) => console.error('Failed to delete banner:', error))
  return updated
})
