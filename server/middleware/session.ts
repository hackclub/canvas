import { eq } from 'drizzle-orm'

// The session is a sealed cookie that's valid until it expires, so a user who's been removed
// from the database would otherwise stay signed in. Checked on API requests only, with a
// primary key lookup. Also where activity is recorded for the admin graphs.
export default defineEventHandler(async (event) => {
  if (!getRequestURL(event).pathname.startsWith('/api/')) return
  const { user } = await getUserSession(event)
  if (!user) return

  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { id: true },
  })
  if (!row) await clearUserSession(event)
  else await recordActivity(user.id)
})
