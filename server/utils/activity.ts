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

const DAY = 24 * HOUR

type DailyCache = typeof schema.dailyActiveLogins | typeof schema.dailyActiveUsers

// A count for each UTC day from `start` up to `end` (both day starts, in ms), as rows like the
// hourly ones. Days that are over come from `cache` (daily_active_logins or daily_active_users),
// and the ones that aren't in it yet are counted (together, by `countDays`, which gets the first
// day to count from and returns a count per day start) and saved. Today is counted every time.
async function getCachedDaily(
  cache: DailyCache,
  start: number,
  end: number,
  countDays: (from: number) => Promise<Map<number, number>>,
) {
  const db = useDB()
  const todayStart = Math.floor(Date.now() / DAY) * DAY
  const days: number[] = []
  for (let t = start; t < end; t += DAY) days.push(t)

  const pastEnd = Math.min(end, todayStart)
  const cached = pastEnd > start
    ? await db.select().from(cache).where(and(gte(cache.day, new Date(start)), lt(cache.day, new Date(pastEnd))))
    : []
  const counts = new Map(cached.map((r) => [r.day.getTime(), r.users]))

  // Everything not cached: past days that were never saved, and today
  const uncounted = days.filter((t) => !counts.has(t))
  if (uncounted.length) {
    const byDay = await countDays(uncounted[0]!)

    const toSave: { day: Date, users: number }[] = []
    for (const t of uncounted) {
      const users = byDay.get(t) ?? 0
      counts.set(t, users)
      // Days that are over won't change, so they're saved. Today isn't.
      if (t < todayStart) toSave.push({ day: new Date(t), users })
    }
    if (toSave.length) {
      await db.insert(cache).values(toSave).onConflictDoNothing()
        .catch((e) => console.error('Failed to save daily active counts', e))
    }
  }

  return days.map((t) => ({ at: new Date(t), users: counts.get(t) ?? 0 }))
}

const dayOf = (column: typeof schema.userActivity.hour | typeof schema.userCodingDays.day) =>
  sql<Date>`date_trunc('day', ${column} at time zone 'UTC') at time zone 'UTC'`.mapWith((v) => new Date(v))

// Active logins: people who made any request, from the hourly activity rows
const getDailyActiveLogins = (start: number, end: number) =>
  getCachedDaily(schema.dailyActiveLogins, start, end, async (from) => {
    const rows = await useDB()
      .select({ day: dayOf(schema.userActivity.hour), users: sql<number>`count(distinct ${schema.userActivity.userId})::int` })
      .from(schema.userActivity)
      .where(and(gte(schema.userActivity.hour, new Date(from)), lt(schema.userActivity.hour, new Date(end))))
      .groupBy(sql`1`)
    return new Map(rows.map((r) => [new Date(r.day).getTime(), r.users]))
  })

// Active users: people who coded at least ACTIVE_CODING_SECONDS, from the coding log
const getDailyActiveUsers = (start: number, end: number) =>
  getCachedDaily(schema.dailyActiveUsers, start, end, async (from) => {
    const rows = await useDB()
      .select({ day: dayOf(schema.userCodingDays.day), users: sql<number>`count(*)::int` })
      .from(schema.userCodingDays)
      .where(and(
        gte(schema.userCodingDays.day, new Date(from)),
        lt(schema.userCodingDays.day, new Date(end)),
        gte(schema.userCodingDays.seconds, ACTIVE_CODING_SECONDS),
      ))
      .groupBy(sql`1`)
    return new Map(rows.map((r) => [new Date(r.day).getTime(), r.users]))
  })

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

// Time on linked Hackatime projects in a day for someone to count as an active user
export const ACTIVE_CODING_SECONDS = 15 * 60

// Active logins per UTC day and per hour, and active users (people who coded at least
// ACTIVE_CODING_SECONDS that day, see userCodingDays) per UTC day, between `from` and `to` (inclusive days), with
// empty buckets filled in as zero
export async function getActivity(from: Date, to: Date) {
  const start = from.getTime()
  const end = to.getTime() + 24 * HOUR
  const range = and(gte(schema.userActivity.hour, new Date(start)), lt(schema.userActivity.hour, new Date(end)))

  const [hourly, daily, coders, [total]] = await Promise.all([
    useDB()
      .select({
        at: schema.userActivity.hour,
        users: sql<number>`count(*)::int`,
      })
      .from(schema.userActivity)
      .where(range)
      .groupBy(schema.userActivity.hour),
    getDailyActiveLogins(start, end),
    getDailyActiveUsers(start, end),
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
    dailyActive: fill(coders, 24 * HOUR),
    hourly: fill(hourly, HOUR),
  }
}
