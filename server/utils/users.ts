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

// Adds a Slack user to the channel in SLACK_CHANNEL_ID, for people signing up to Canvas. Does
// nothing if no channel is set. The bot has to be in the channel, with the channels:manage
// scope (groups:write for a private channel). Never throws: it's not worth failing a
// sign-in over.
export async function addToSlackChannel(slackId: string) {
  const { slack } = useRuntimeConfig()
  if (!slack.botToken || !slack.channelId) return
  try {
    const res = await $fetch<{ ok: boolean, error?: string }>('https://slack.com/api/conversations.invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${slack.botToken}` },
      body: { channel: slack.channelId, users: slackId },
    })
    // Already being in the channel is what we wanted
    if (!res.ok && res.error !== 'already_in_channel') throw new Error(res.error)
  } catch (error) {
    console.error('Failed to add user to the Slack channel:', error)
  }
}
