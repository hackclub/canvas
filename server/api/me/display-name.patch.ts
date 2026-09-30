import { eq } from 'drizzle-orm'

// PATCH /api/me/display-name { displayNameOverride } — sets the name shown instead of the
// user's Slack display name. Empty or null clears it, going back to the Slack name.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ displayNameOverride?: unknown }>(event)
  const value = body?.displayNameOverride

  if (value !== null && typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Display name must be text' })
  }
  // Collapses runs of whitespace (including newlines) so names stay on one line
  const override = value?.replace(/\s+/g, ' ').trim() || null
  if (override && override.length > MAX_DISPLAY_NAME_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Display names can be at most ${MAX_DISPLAY_NAME_LENGTH} characters`,
    })
  }

  const [updated] = await useDB()
    .update(schema.users)
    .set({ displayNameOverride: override })
    .where(eq(schema.users.id, user.id))
    .returning({
      slackDisplayName: schema.users.slackDisplayName,
      displayNameOverride: schema.users.displayNameOverride,
    })
  return updated
})
