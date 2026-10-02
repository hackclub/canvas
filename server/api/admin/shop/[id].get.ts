// GET /api/admin/shop/:id — one shop item
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return requireShopItem(event)
})
