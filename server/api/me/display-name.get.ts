import { eq } from 'drizzle-orm'

// GET /api/me/display-name — the signed-in user's own name settings. This is the only
// route that returns both names, since it's the user's own data and the settings page
// needs to show what the override is replacing. Everything else should use publicName().
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { slackDisplayName: true, displayNameOverride: true },
  })
  return {
    slackDisplayName: row?.slackDisplayName ?? null,
    displayNameOverride: row?.displayNameOverride ?? null,
  }
})
