import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import type { SlackMessageType } from '../../../shared/types/audit'

interface Body {
  // Which message: one written here ("custom"), or one of the automatic ones
  type?: unknown
  // Slack mrkdwn, for "custom"
  message?: unknown
  // Who to send it to, ignored if `everyone`
  userIds?: unknown
  everyone?: unknown
}

const TYPES: SlackMessageType[] = ['custom', 'welcome', 'nudge', 'shipApproved', 'shipRejected']

// Slack's limit for a section block's text
const MAX_MESSAGE_LENGTH = 3000

// POST /api/admin/messages — DMs a message on Slack to the chosen users, or to everyone who
// hasn't unsubscribed (with an unsubscribe button). Either a custom one, or one of the automatic
// ones filled in with each person's details (see sendTemplate), e.g. their latest rejected ship.
// People without a Slack ID are left out. Sent in the background, one a second (see slackApi),
// returns how many it's going to.
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  if (!canSendSlack()) {
    throw createError({ statusCode: 503, statusMessage: 'Slack messages need SLACK_XOXB and SITE_URL set' })
  }
  const body = await readBody<Body>(event)

  const type = (body?.type ?? 'custom') as SlackMessageType
  if (!TYPES.includes(type)) throw createError({ statusCode: 400, statusMessage: 'Unknown message type' })

  let message = ''
  if (type === 'custom') {
    message = typeof body?.message === 'string' ? body.message.trim() : ''
    if (!message) throw createError({ statusCode: 400, statusMessage: 'Write a message' })
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw createError({ statusCode: 400, statusMessage: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters` })
    }
  }

  const everyone = body?.everyone === true
  let userIds: string[] = []
  if (!everyone) {
    if (!Array.isArray(body?.userIds) || !body.userIds.every((id) => typeof id === 'string')) {
      throw createError({ statusCode: 400, statusMessage: 'Pick who to send it to' })
    }
    userIds = [...new Set(body.userIds as string[])]
    if (!userIds.length) throw createError({ statusCode: 400, statusMessage: 'Pick who to send it to' })
  }

  const recipients = await useDB()
    .select({ id: schema.users.id, slackId: schema.users.slackId })
    .from(schema.users)
    .where(and(
      isNotNull(schema.users.slackId),
      everyone ? eq(schema.users.broadcastsUnsubscribed, false) : inArray(schema.users.id, userIds),
    )) as Recipient[]

  await logAdminAction(
    useDB(),
    me.id,
    { action: 'slack.message', details: { type, message, everyone, recipients: recipients.length } },
    { userId: !everyone && userIds.length === 1 ? userIds[0] : null },
  )

  sendAdminMessage(type, message, recipients, everyone, me.id).then((counts) => {
    console.log(`Admin ${type} message from ${me.id}: ${counts.sent} sent, ${counts.skipped} skipped, ${counts.failed} failed`)
  })
  return { recipients: recipients.length }
})
