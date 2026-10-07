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
