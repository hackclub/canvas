import { eq } from 'drizzle-orm'

// GET /api/hackatime — whether the signed-in user has linked Hackatime. Never returns the token.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { hackatime: true },
  })
  return { linked: !!row?.hackatime }
})
