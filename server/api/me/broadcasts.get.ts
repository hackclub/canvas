import { eq } from 'drizzle-orm'

// GET /api/me/broadcasts — whether the user gets admin messages sent to everyone on Slack
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { broadcastsUnsubscribed: true },
  })
  return { subscribed: !row?.broadcastsUnsubscribed }
})
