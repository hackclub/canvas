import { eq } from 'drizzle-orm'

// GET /unsubscribe?user=&sig= — the unsubscribe button on admin messages sent to everyone.
// Signed (see unsubscribeSignature) so it works from Slack without signing in. They can
// subscribe again on their account page.
export default defineEventHandler(async (event) => {
  const { user, sig } = getQuery(event)
  if (typeof user !== 'string' || typeof sig !== 'string' || !verifyUnsubscribeSignature(user, sig)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid unsubscribe link' })
  }
  await useDB()
    .update(schema.users)
    .set({ broadcastsUnsubscribed: true })
    .where(eq(schema.users.id, user))
  return sendRedirect(event, '/unsubscribed')
})
