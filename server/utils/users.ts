import { sql } from 'drizzle-orm'

export const MAX_DISPLAY_NAME_LENGTH = 32

// The name to show other people: the user's display name override if they've set one,
// otherwise their Slack display name. Resolved in SQL so public routes only ever get the
// one name, never both. Null if they have neither.
export function publicName() {
  return sql<string | null>`coalesce(${schema.users.displayNameOverride}, ${schema.users.slackDisplayName})`
}

interface SlackUsersInfo {
  ok: boolean
  error?: string
  user?: { profile?: { display_name?: string } }
}

// Looks up a Slack user's display name with the bot token (needs the users:read scope).
// Returns null if they haven't set one, or undefined if Slack couldn't be reached, so
// callers can keep the name they already have.
export async function fetchSlackDisplayName(slackId: string) {
  const { slack } = useRuntimeConfig()
  if (!slack.botToken) return undefined
  try {
    const res = await $fetch<SlackUsersInfo>('https://slack.com/api/users.info', {
      query: { user: slackId },
      headers: { Authorization: `Bearer ${slack.botToken}` },
    })
    if (!res.ok) throw new Error(res.error)
    return res.user?.profile?.display_name?.trim() || null
  } catch (error) {
    console.error('Failed to fetch Slack display name:', error)
    return undefined
  }
}
