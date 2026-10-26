import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, desc, eq, inArray, isNotNull, isNull, lt, lte, max } from 'drizzle-orm'
import type { SlackMessageType } from '../../shared/types/audit'

// Slack DMs sent by the bot (needs the chat:write scope): ship reviews, the welcome and
// "you haven't started yet" DMs (sent by server/plugins/notifications.ts), and admin messages.
// Every DM, sent or not, goes in the bot log (schema.botLog).

// How long after signing up each scheduled DM is sent
export const WELCOME_DELAY = 30 * 60 * 1000
export const NUDGE_DELAY = 2 * 24 * 60 * 60 * 1000
// Coding at least this much on their projects by then means they've started, so no nudge
const NUDGE_MIN_SECONDS = 15 * 60

type Block = Record<string, unknown>
// "primary" is green, "danger" red
interface Button { text: string, url: string, style?: 'primary' | 'danger' }
export interface Recipient { id: string, slackId: string }

// --- Talking to Slack ---

// Slack allows about one message a second per conversation, with a workspace-wide limit on top
// that it doesn't publish. Every call from this server goes through one queue, at most one a
// second, so a big send (an admin messaging everyone, the catch-up of scheduled DMs) can't
// trip it. Senders wait for each DM before queueing the next, so a ship review's DM only ever
// waits behind one of theirs rather than all of them.
const SLACK_SPACING = 1000
// A rate limited call waits as long as Slack says and tries again, this many times
const SLACK_RETRIES = 10
let slackQueue: Promise<unknown> = Promise.resolve()
let slackNextAt = 0

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

class SlackError extends Error {}

// Calls a Slack Web API method with the bot token, in the queue. Throws if Slack says no.
function slackApi<T extends { ok: boolean, error?: string }>(
  method: string,
  request: { query?: Record<string, string>, body?: Record<string, unknown> },
): Promise<T> {
  const { slack } = useRuntimeConfig()
  const call = slackQueue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      await sleep(Math.max(0, slackNextAt - Date.now()))
      slackNextAt = Date.now() + SLACK_SPACING
      const url = new URL(`https://slack.com/api/${method}`)
      if (request.query) url.search = new URLSearchParams(request.query).toString()
      const response = await fetch(url, {
        method: request.body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${slack.botToken}`,
          ...(request.body && { 'Content-Type': 'application/json; charset=utf-8' }),
        },
        body: request.body && JSON.stringify(request.body),
      })
      let retryAfter: number
      if (response.status === 429) {
        retryAfter = Number(response.headers.get('retry-after')) || 30
      } else {
        if (!response.ok) throw new SlackError(`HTTP ${response.status}`)
        const res = await response.json() as T
        if (res.ok) return res
        if (res.error !== 'ratelimited') throw new SlackError(res.error)
        retryAfter = 30
      }
      if (attempt >= SLACK_RETRIES) throw new SlackError('ratelimited')
      // Holds up everything else too, since the limit is probably workspace-wide
      console.warn(`Slack rate limited ${method}, waiting ${retryAfter}s`)
      slackNextAt = Date.now() + retryAfter * 1000
    }
  })
  slackQueue = call.catch(() => {})
  return call
}

// Whether DMs can be sent at all: links in them need SITE_URL
export function canSendSlack() {
  const { slack, siteUrl } = useRuntimeConfig()
  return !!slack.botToken && !!siteUrl
}

// DMs someone and logs it in the bot log. `text` is what notifications and the log show,
// `blocks` what's shown in Slack. With `unsubscribe` (for messages sent to everyone), adds an
// unsubscribe button. Never throws: returns whether it was sent.
async function sendDM(
  to: Recipient,
  type: SlackMessageType,
  message: { text: string, blocks: Block[] },
  actorId: string | null,
  unsubscribe = false,
) {
  let error: string | undefined
  try {
    let blocks = [...message.blocks]
    if (unsubscribe) {
      const query = new URLSearchParams({ user: to.id, sig: unsubscribeSignature(to.id) })
      blocks.push(buttons({ text: 'unsubscribe', url: siteLink(`/unsubscribe?${query}`) }))
    }
    const post = () => slackApi('chat.postMessage', {
      body: { channel: to.slackId, text: message.text, blocks, unfurl_links: false },
    })
    try {
      await post()
    } catch (e) {
      // Slack rejects the whole message if it can't download an image (e.g. SITE_URL is
      // localhost), so it's sent again without them rather than not at all
      const images = blocks.filter((b) => b.type === 'image')
      if (!(e instanceof SlackError) || e.message !== 'invalid_blocks' || !images.length) throw e
      blocks = blocks.filter((b) => b.type !== 'image')
      await post()
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    console.error(`Failed to send a ${type} DM to ${to.id}:`, e)
  }
  await useDB().insert(schema.botLog).values({
    userId: to.id,
    actorId,
    kind: 'message',
    details: { type, text: message.text, ...(error && { error }) },
  }).catch((e) => console.error('Failed to write to the bot log:', e))
  return !error
}

// The user's Slack timezone (e.g. "America/New_York"), or UTC if it can't be found
async function fetchSlackTimezone(slackId: string) {
  try {
    const res = await slackApi<{ ok: boolean, user?: { tz?: string } }>('users.info', { query: { user: slackId } })
    const tz = res.user?.tz
    // Throws for zones this runtime doesn't know
    if (tz) new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz || 'UTC'
  } catch {
    return 'UTC'
  }
}

// --- Message pieces ---

// User text goes into mrkdwn, where &, < and > start links, mentions and entities
export function escapeSlack(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function section(text: string): Block {
  return { type: 'section', text: { type: 'mrkdwn', text } }
}

function image(url: string, alt: string): Block {
  return { type: 'image', image_url: url, alt_text: alt }
}

function buttons(...list: Button[]): Block {
  return {
    type: 'actions',
    elements: list.map((b) => ({
      type: 'button',
      text: { type: 'plain_text', text: b.text, emoji: true },
      url: b.url,
      ...(b.style && { style: b.style }),
    })),
  }
}

// Absolute link to a page on Canvas. Only called once siteUrl is known to be set.
function siteLink(path: string) {
  return new URL(path, useRuntimeConfig().siteUrl).href
}

// The channel to ask questions in: SLACK_CHANNEL_ID, or #canvas if that isn't set
function channelMention() {
  const { slack } = useRuntimeConfig()
  return `<#${slack.channelId || CANVAS_CHANNEL_ID}>`
}

// Hours to at most 1 decimal, like the home page shows them
function formatHours(hours: number) {
  const value = Math.round(hours * 10) / 10
  return `${value} hour${value === 1 ? '' : 's'}`
}

// --- Dates ---

// The date and time it is in a timezone at `date`, as numbers
function zonedParts(date: Date, timeZone: string) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    }).formatToParts(date).map((p) => [p.type, Number(p.value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>
}

// Midnight at the start of the day `days` days after today, in a timezone
function startOfDayIn(timeZone: string, days: number, from = new Date()) {
  const today = zonedParts(from, timeZone)
  // That midnight as if the zone were UTC, then moved by the zone's offset at that moment
  const asUtc = Date.UTC(today.year, today.month - 1, today.day + days)
  const p = zonedParts(new Date(asUtc), timeZone)
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - asUtc
  return new Date(asUtc - offset)
}

// --- The ship boost (double pixels deal) ---

// Turns on someone's double pixels deal until the end of the day after tomorrow where they
// are (e.g. on a Thursday it lasts all of Saturday), and logs it. Returns when it ends and the
// timezone that was used.
export async function enableShipBoost(user: { id: string, slackId: string | null }, reason: 'nudge' | 'admin', actorId: string | null) {
  const timeZone = user.slackId ? await fetchSlackTimezone(user.slackId) : 'UTC'
  const until = startOfDayIn(timeZone, 3)
  await useDB().transaction(async (tx) => {
    await tx.update(schema.users).set({ shipBoostUntil: until }).where(eq(schema.users.id, user.id))
    await tx.insert(schema.botLog).values({
      userId: user.id,
      actorId,
      kind: 'boost',
      details: { enabled: true, until: until.toISOString(), reason },
    })
  })
  return { until, timeZone }
}

export async function disableShipBoost(userId: string, actorId: string) {
  await useDB().transaction(async (tx) => {
    await tx.update(schema.users).set({ shipBoostUntil: null }).where(eq(schema.users.id, userId))
    await tx.insert(schema.botLog).values({
      userId,
      actorId,
      kind: 'boost',
      details: { enabled: false, until: null, reason: 'admin' },
    })
  })
}

// --- Each kind of DM ---

function shipApprovedMessage(ship: { projectId: number, name: string }, payout: { pixels: number, bonusPoints: number, hours: number }) {
  const text = `hi! your project "${escapeSlack(ship.name)}" with ${formatHours(payout.hours)} was approved!\n\n`
    + `you got *${payout.pixels} pixels* and *${payout.bonusPoints} bonus points* :o`
  return { text, blocks: [section(text), buttons({ text: 'check it out!', url: siteLink(`/app/projects/${ship.projectId}`) })] }
}

function shipRejectedMessage(ship: { projectId: number, name: string }, feedback: string) {
  // Three backticks in the reason would end the code block early
  const reason = escapeSlack(feedback).replace(/```/g, "'''")
  const text = `hi! your project "${escapeSlack(ship.name)}" was rejected for the following reason:\n\n\`\`\`\n${reason}\n\`\`\``
  return { text, blocks: [section(text), buttons({ text: 'more info', url: siteLink(`/app/projects/${ship.projectId}`) })] }
}

async function welcomeMessage(userId: string) {
  const referral = siteLink(`/?ref=${await getReferralCode(userId)}`)
  const text = 'hii! welcome to canvas!!\n\n'
    + 'build cool projects, paint on a shared canvas, and get free loot :o\n'
    + 'the final canvas gets put up at HQ, and available as postcards and posters in the shop.\n\n'
    // In <>, or Slack takes the closing * as part of the link
    + `*psst.. invite your friends and get pixels once they paint on the canvas: <${referral}>*\n\n`
    + `if you have any questions, feel free to ask in ${channelMention()}`
  return {
    text,
    blocks: [
      image(siteLink('/img/paintprize.jpg'), 'Canvas by Hack Club: paint pixels, get prizes.'),
      section(text),
      buttons({ text: 'shop', url: siteLink('/app/shop') }, { text: 'the canvas', url: siteLink('/app/canvas') }),
    ],
  }
}

function nudgeMessage(projectId: number, weekday: string) {
  const text = "oh hello again! i noticed you haven't started working on your project yet. :c\n\n"
    + 'that said, i come with a trade offer..\n\n'
    + `*if you ship BEFORE the end of ${weekday}, i'll DOUBLE your pixel payout* (up to ${SHIP_BOOST_MAX} extra pixels!!)\n\n`
    + "doesn't have to be a big project either!"
  return { text, blocks: [section(text), buttons({ text: 'LOCK IN!!', url: siteLink(`/app/projects/${projectId}`), style: 'primary' })] }
}

// Turns on the double pixels deal and DMs them about it, linking to `projectId`
async function sendNudge(to: Recipient, projectId: number, actorId: string | null, unsubscribe = false) {
  const { until, timeZone } = await enableShipBoost(to, 'nudge', actorId)
  // The last day it covers, not the midnight it ends at
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(new Date(until.getTime() - 1))
  return sendDM(to, 'nudge', nudgeMessage(projectId, weekday), actorId, unsubscribe)
}

// The ship's project and its owner, null if they can't be DMed
async function shipRecipient(shipId: number) {
  const [row] = await useDB()
    .select({ projectId: schema.projects.id, name: schema.projects.name, id: schema.users.id, slackId: schema.users.slackId })
    .from(schema.ships)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
    .innerJoin(schema.users, eq(schema.users.id, schema.projects.userId))
    .where(eq(schema.ships.id, shipId))
  return row?.slackId && canSendSlack() ? row as typeof row & { slackId: string } : null
}

// Tells a ship's owner it was approved and what they got. Never throws.
export async function notifyShipApproved(shipId: number, payout: { pixels: number, bonusPoints: number, hours: number }, reviewerId: string) {
  try {
    const ship = await shipRecipient(shipId)
    if (ship) await sendDM(ship, 'shipApproved', shipApprovedMessage(ship, payout), reviewerId)
  } catch (error) {
    console.error(`Failed to DM about ship ${shipId} being approved:`, error)
  }
}

// Tells a ship's owner it was rejected and why. Never throws.
export async function notifyShipRejected(shipId: number, feedback: string, reviewerId: string) {
  try {
    const ship = await shipRecipient(shipId)
    if (ship) await sendDM(ship, 'shipRejected', shipRejectedMessage(ship, feedback), reviewerId)
  } catch (error) {
    console.error(`Failed to DM about ship ${shipId} being rejected:`, error)
  }
}

// --- Scheduled DMs ---

// Gives someone who hasn't started coding the double pixels deal and DMs them about it if
// they're on Slack (the deal shows as a banner either way). Returns false if it couldn't be
// decided yet (Hackatime is down), to try again later.
async function nudgeIfIdle(user: { id: string, slackId: string | null }) {
  // The newest changed first, which is the one the DM links to
  const projects = await useDB().query.projects.findMany({
    where: eq(schema.projects.userId, user.id),
    columns: { id: true, hackatimeProjects: true },
    orderBy: desc(schema.projects.updatedAt),
  })
  // Nothing to tell them to work on
  const project = projects[0]
  if (!project) return true

  let seconds: number | null
  try {
    seconds = await getProjectHackatimeSeconds(user.id, projects.flatMap((p) => p.hackatimeProjects))
  } catch {
    return false
  }
  if ((seconds ?? 0) >= NUDGE_MIN_SECONDS) return true

  if (user.slackId) await sendNudge({ id: user.id, slackId: user.slackId }, project.id, null)
  else await enableShipBoost(user, 'nudge', null)
  return true
}

// Most of each kind of scheduled DM per run (a minute apart). Sends are a second apart, so a
// run takes at most about this many seconds of each.
const BATCH = 50

// Sends the welcome and nudge DMs that are due, including to people who signed up before
// these existed, welcomes first. Each user is claimed (their timestamp set) before anything is sent, so
// instances running this at the same time never DM someone twice. A DM that fails isn't
// retried, it's in the bot log with its error.
export async function sendScheduledMessages() {
  const db = useDB()
  const now = Date.now()

  const welcomeDue = and(
    isNull(schema.users.welcomeMessageSentAt),
    lte(schema.users.createdAt, new Date(now - WELCOME_DELAY)),
  )
  const welcomes = await db
    .update(schema.users)
    .set({ welcomeMessageSentAt: new Date() })
    // Checked again outside the subquery, so a row another instance just claimed is skipped
    .where(and(welcomeDue, inArray(schema.users.id, db.select({ id: schema.users.id }).from(schema.users).where(welcomeDue).orderBy(schema.users.createdAt).limit(BATCH))))
    .returning({ id: schema.users.id, slackId: schema.users.slackId })
  for (const user of welcomes) {
    if (!user.slackId) continue
    await sendTemplate('welcome', { id: user.id, slackId: user.slackId }, null)
      .catch((error) => console.error(`Failed to send the welcome DM to ${user.id}:`, error))
  }

  // Nudges wait until everyone due a welcome has had it, so a backlog (like the catch-up after
  // this first shipped) goes out as all the welcomes, then all the nudges
  const [welcomesLeft] = await db.select({ id: schema.users.id }).from(schema.users).where(welcomeDue).limit(1)
  if (welcomesLeft) return

  // No nudges (or their double pixels deal) while ships are closed. Nobody's claimed, so if
  // ships open again, everyone due one gets it then.
  if (useRuntimeConfig().public.shipsClosed) return

  const nudgeDue = and(
    isNull(schema.users.nudgeCheckedAt),
    lte(schema.users.createdAt, new Date(now - NUDGE_DELAY)),
  )
  const nudges = await db
    .update(schema.users)
    .set({ nudgeCheckedAt: new Date() })
    .where(and(nudgeDue, inArray(schema.users.id, db.select({ id: schema.users.id }).from(schema.users).where(nudgeDue).orderBy(schema.users.createdAt).limit(BATCH))))
    .returning({ id: schema.users.id, slackId: schema.users.slackId })
  for (const user of nudges) {
    const done = await nudgeIfIdle(user).catch((error) => {
      console.error(`Failed to nudge ${user.id}:`, error)
      return true
    })
    // Hackatime couldn't be reached: unclaimed so the next run looks again
    if (!done) await db.update(schema.users).set({ nudgeCheckedAt: null }).where(eq(schema.users.id, user.id))
  }
}

// --- Admin messages ---

// Hours a paid ship was paid for: the reviewer's hours, or its time since the project's ship
// paid before it
async function paidShipHours(ship: { id: number, projectId: number, hackatimeSeconds: number | null, justification: { overrideHours: number | null } | null }) {
  if (ship.justification?.overrideHours != null) return ship.justification.overrideHours
  const [previous] = await useDB()
    .select({ seconds: max(schema.ships.hackatimeSeconds) })
    .from(schema.ships)
    .where(and(
      eq(schema.ships.projectId, ship.projectId),
      lt(schema.ships.id, ship.id),
      isNotNull(schema.ships.pixelsAwarded),
    ))
  return Math.max(0, (ship.hackatimeSeconds ?? 0) - (previous?.seconds ?? 0)) / 3600
}

// Their latest ship that's paid (for "shipApproved") or rejected, with its project
async function latestShip(userId: string, type: 'shipApproved' | 'shipRejected') {
  const [ship] = await useDB()
    .select({
      id: schema.ships.id,
      projectId: schema.ships.projectId,
      name: schema.projects.name,
      feedback: schema.ships.feedback,
      hackatimeSeconds: schema.ships.hackatimeSeconds,
      justification: schema.ships.justification,
      pixelsAwarded: schema.ships.pixelsAwarded,
      bonusPointsAwarded: schema.ships.bonusPointsAwarded,
    })
    .from(schema.ships)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
    .where(and(
      eq(schema.projects.userId, userId),
      type === 'shipApproved' ? isNotNull(schema.ships.pixelsAwarded) : eq(schema.ships.status, 'rejected'),
    ))
    .orderBy(desc(schema.ships.reviewedAt), desc(schema.ships.id))
    .limit(1)
  return ship
}

// Sends one of the automatic DMs to someone, with their own details: their latest approved or
// rejected ship, their referral link, or their latest project for the nudge (which turns on
// their double pixels deal, without checking if they've coded). "skipped" if they don't have
// what it needs, e.g. no approved ships. `unsubscribe` is as for sendDM.
export async function sendTemplate(type: Exclude<SlackMessageType, 'custom'>, to: Recipient, actorId: string | null, unsubscribe = false): Promise<'sent' | 'skipped' | 'failed'> {
  const result = (sent: boolean) => sent ? 'sent' : 'failed'
  switch (type) {
    case 'welcome':
      return result(await sendDM(to, 'welcome', await welcomeMessage(to.id), actorId, unsubscribe))
    case 'nudge': {
      const project = await useDB().query.projects.findFirst({
        where: eq(schema.projects.userId, to.id),
        columns: { id: true },
        orderBy: desc(schema.projects.updatedAt),
      })
      if (!project) return 'skipped'
      return result(await sendNudge(to, project.id, actorId, unsubscribe))
    }
    case 'shipApproved': {
      const ship = await latestShip(to.id, type)
      if (!ship) return 'skipped'
      const payout = { pixels: ship.pixelsAwarded ?? 0, bonusPoints: ship.bonusPointsAwarded ?? 0, hours: await paidShipHours(ship) }
      return result(await sendDM(to, type, shipApprovedMessage(ship, payout), actorId, unsubscribe))
    }
    case 'shipRejected': {
      const ship = await latestShip(to.id, type)
      if (!ship) return 'skipped'
      return result(await sendDM(to, type, shipRejectedMessage(ship, ship.feedback), actorId, unsubscribe))
    }
  }
}

// Signs a user ID for their unsubscribe link, so it works without signing in but can't be
// made for someone else
export function unsubscribeSignature(userId: string) {
  const { tokenKey } = useRuntimeConfig()
  if (!tokenKey) throw new Error('TOKEN_ENCRYPTION_KEY is not set (see .env.example)')
  return createHmac('sha256', tokenKey).update(`unsubscribe:${userId}`).digest('base64url')
}

export function verifyUnsubscribeSignature(userId: string, signature: string) {
  const expected = Buffer.from(unsubscribeSignature(userId))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

// Sends an admin's message (a custom one, or one of the automatic ones) to each recipient, one
// at a time. Ones sent to everyone get an unsubscribe button. Returns how each went.
export async function sendAdminMessage(
  type: SlackMessageType,
  message: string,
  recipients: Recipient[],
  everyone: boolean,
  actorId: string,
) {
  const counts = { sent: 0, skipped: 0, failed: 0 }
  for (const to of recipients) {
    let outcome: keyof typeof counts
    try {
      outcome = type === 'custom'
        ? await sendDM(to, 'custom', { text: message, blocks: [section(message)] }, actorId, everyone) ? 'sent' : 'failed'
        : await sendTemplate(type, to, actorId, everyone)
    } catch (error) {
      console.error(`Failed to send an admin message to ${to.id}:`, error)
      outcome = 'failed'
    }
    counts[outcome]++
  }
  return counts
}
