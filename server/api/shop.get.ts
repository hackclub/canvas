import { asc, eq } from 'drizzle-orm'

// GET /api/shop — the signed-in user's bonus points and everything in the shop, cheapest first
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const [me, items] = await Promise.all([
    useDB().query.users.findFirst({
      where: eq(schema.users.id, user.id),
      columns: { bonusPoints: true },
    }),
    useDB().query.shopItems.findMany({
      columns: { id: true, name: true, description: true, bannerKey: true, price: true, stock: true },
      orderBy: [asc(schema.shopItems.price), asc(schema.shopItems.id)],
    }),
  ])
  return { bonusPoints: me?.bonusPoints ?? 0, items }
})
