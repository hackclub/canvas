import { asc, eq } from 'drizzle-orm'

// GET /api/shop/featured — the shop items admins picked for the landing page. Public, so only
// what the carousel shows.
export default defineEventHandler(async () => {
  return useDB().query.shopItems.findMany({
    columns: { id: true, name: true, description: true, bannerKey: true, price: true, stock: true },
    where: eq(schema.shopItems.showOnLanding, true),
    orderBy: [asc(schema.shopItems.price), asc(schema.shopItems.id)],
  })
})
