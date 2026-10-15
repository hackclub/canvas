import { eq } from 'drizzle-orm'

// PATCH /api/me/broadcasts — subscribes to or unsubscribes from admin messages sent to everyone
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ subscribed?: unknown }>(event)
  if (typeof body?.subscribed !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'subscribed must be true or false' })
  }
  await useDB()
    .update(schema.users)
    .set({ broadcastsUnsubscribed: !body.subscribed })
    .where(eq(schema.users.id, user.id))
  return { subscribed: body.subscribed }
})
