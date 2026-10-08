import { eq } from 'drizzle-orm'

// GET /api/pixels — the signed-in user's pixel and bonus point balances
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { pixels: true, bonusPoints: true },
  })
  return { pixels: row?.pixels ?? 0, bonusPoints: row?.bonusPoints ?? 0 }
})
