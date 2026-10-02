import { eq } from 'drizzle-orm'

// PUT /api/admin/shop/:id/banner (multipart, `banner` file field) — sets the item's banner.
// The upload is re-encoded to WebP (see readBannerUpload).
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const item = await requireShopItem(event)
  const image = await readBannerUpload(event)

  // A fresh key per upload, so /images/<key> can be cached forever
  const key = `shop/${item.id}/${crypto.randomUUID()}.webp`
  await putR2Object(key, image, 'image/webp')

  const updated = await useDB().transaction(async (tx) => {
    const [updated] = await tx
      .update(schema.shopItems)
      .set({ bannerKey: key, updatedAt: new Date() })
      .where(eq(schema.shopItems.id, item.id))
      .returning()
    await logAdminAction(tx, me.id, {
      action: 'shop.update',
      details: { itemId: item.id, name: item.name, changes: ['banner'] },
    })
    return updated
  })

  if (item.bannerKey) {
    await deleteR2Object(item.bannerKey).catch((error) => console.error('Failed to delete old banner:', error))
  }
  return updated
})
