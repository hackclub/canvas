import { asc } from 'drizzle-orm'

// GET /api/admin/shop — every shop item, cheapest first
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return useDB().query.shopItems.findMany({
    orderBy: [asc(schema.shopItems.price), asc(schema.shopItems.id)],
  })
})
