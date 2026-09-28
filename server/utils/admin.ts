import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'

// Like requireUserSession, but also 403s unless the user is an admin.
// Checks the database rather than the session, so removing an admin takes effect immediately.
export async function requireAdmin(event: H3Event) {
  const session = await requireUserSession(event)
  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
    columns: { isAdmin: true },
  })
  if (!row?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Admins only' })
  }
  return session
}
