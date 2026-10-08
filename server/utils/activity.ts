import { and, gte, lt, sql } from 'drizzle-orm'

const HOUR = 60 * 60 * 1000

// The last hour each user was recorded in, so most requests don't touch the database.
// Per process, so a restart or a second instance just means an extra (idempotent) insert.
const lastRecorded = new Map<string, number>()

// Marks the user as active this hour, at most one insert per user per hour
export async function recordActivity(userId: string) {
  const hour = Math.floor(Date.now() / HOUR) * HOUR
  if (lastRecorded.get(userId) === hour) return
  lastRecorded.set(userId, hour)

  // Drop users from previous hours so the map doesn't grow forever
  for (const [id, h] of lastRecorded) if (h !== hour) lastRecorded.delete(id)

  recordStatSnapshot(hour)

  try {
    await useDB()
      .insert(schema.userActivity)
      .values({ userId, hour: new Date(hour) })
      .onConflictDoNothing()
  } catch (e) {
    // Let the next request retry, and never fail a request over analytics
    lastRecorded.delete(userId)
    console.error('Failed to record activity', e)
  }
}

export const ACTIVITY_MAX_DAYS = 60

// Reads ?from= and ?to= (YYYY-MM-DD, UTC days, inclusive) for the admin graphs. Defaults to the
// last 7 days, and 400s for ranges over ACTIVITY_MAX_DAYS.
export function parseActivityRange(event: import('h3').H3Event) {
  const query = getQuery(event)
  const parseDay = (v: unknown) => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
    const d = new Date(`${v}T00:00:00Z`)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  const to = parseDay(query.to) ?? today
  const from = parseDay(query.from) ?? new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000)

  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000) + 1
  if (days < 1 || days > ACTIVITY_MAX_DAYS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Pick a range of 1 to ${ACTIVITY_MAX_DAYS} days`,
    })
  }
  return { from, to }
}

// Active users per UTC day and per hour between `from` and `to` (inclusive days), with
// empty buckets filled in as zero
export async function getActivity(from: Date, to: Date) {
  const start = from.getTime()
  const end = to.getTime() + 24 * HOUR
  const range = and(gte(schema.userActivity.hour, new Date(start)), lt(schema.userActivity.hour, new Date(end)))

  const [hourly, daily, [total]] = await Promise.all([
    useDB()
      .select({
        at: schema.userActivity.hour,
        users: sql<number>`count(*)::int`,
      })
      .from(schema.userActivity)
      .where(range)
      .groupBy(schema.userActivity.hour),
    useDB()
      .select({
        at: sql<Date>`date_trunc('day', ${schema.userActivity.hour} at time zone 'UTC') at time zone 'UTC'`.mapWith((v) => new Date(v)),
        users: sql<number>`count(distinct ${schema.userActivity.userId})::int`,
      })
      .from(schema.userActivity)
      .where(range)
      .groupBy(sql`1`),
    useDB().select({ count: sql<number>`count(*)::int` }).from(schema.users),
  ])

  const fill = (rows: { at: Date, users: number }[], step: number) => {
    const byTime = new Map(rows.map((r) => [new Date(r.at).getTime(), r.users]))
    const out: { at: string, users: number }[] = []
    for (let t = start; t < end; t += step) {
      out.push({ at: new Date(t).toISOString(), users: byTime.get(t) ?? 0 })
    }
    return out
  }

  return {
    totalUsers: total!.count,
    daily: fill(daily, 24 * HOUR),
    hourly: fill(hourly, HOUR),
  }
}
