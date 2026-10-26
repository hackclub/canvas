import { isDeepStrictEqual } from 'node:util'
import { eq } from 'drizzle-orm'

// PATCH /api/admin/shop/:id { name?, description?, price?, stock?, showInApp?, showOnLanding?, showQuantity?,
// perUserLimit?, checkoutLimit?, checkoutLimitEnabled?, disclaimer?, silly?, requirePhone?, pixels?, fields? } — changes a shop item
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const item = await requireShopItem(event)
  const input = parseShopItem(await readBody(event), true)
  checkPixelItem(input, item)

  // Compared deeply (ignoring key order, which jsonb doesn't keep) so the fields list only
  // counts as changed if something in it did
  const changes = (Object.keys(input) as (keyof typeof input)[])
    .filter((field) => !isDeepStrictEqual(input[field], item[field]))
  if (!changes.length) return item

  return useDB().transaction(async (tx) => {
    const [updated] = await tx
      .update(schema.shopItems)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.shopItems.id, item.id))
      .returning()
    await logAdminAction(tx, me.id, {
      action: 'shop.update',
      details: { itemId: item.id, name: updated!.name, changes },
    })
    return updated!
  })
})
