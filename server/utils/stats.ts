import { and, asc, desc, gte, lt, isNotNull, sql } from 'drizzle-orm'

const DAY = 24 * 60 * 60 * 1000

// Hours coded but not shipped: for each user, the time on their linked Hackatime projects as
// of the last time we looked (users.linkedSecondsSeen), minus what their projects were last
// paid for. People who haven't opened Canvas lately are as stale as their last visit.
async function unshippedSecondsNow() {
  const [row] = await useDB().execute<{ seconds: number }>(sql`
    select coalesce(sum(greatest(0, u.linked_seconds_seen - coalesce(s.shipped, 0))), 0)::bigint as seconds
    from users u
    left join (
      select p.user_id, sum(ps.seconds) as shipped
      from projects p
      join (
        select project_id, max(hackatime_seconds) as seconds
        from ships where pixels_awarded is not null group by project_id
      ) ps on ps.project_id = p.id
      group by p.user_id
    ) s on s.user_id = u.id
  `)
  return Number(row!.seconds)
}

let lastSnapshotHour = 0

// Saves this hour's unshipped hours, at most once per hour per process
export function recordStatSnapshot(hour: number) {
  if (lastSnapshotHour === hour) return
  lastSnapshotHour = hour
  unshippedSecondsNow()
    .then((unshippedSeconds) => useDB()
      .insert(schema.statSnapshots)
      .values({ hour: new Date(hour), unshippedSeconds })
      .onConflictDoNothing())
    .catch((e) => {
      lastSnapshotHour = 0
      console.error('Failed to record stat snapshot', e)
    })
}

// Hours of each paid ship: the time since the project's previous paid
// ship (or the reviewer's override), and when it was approved
async function paidShipHours() {
  const ships = await useDB()
    .select({
      projectId: schema.ships.projectId,
      seconds: schema.ships.hackatimeSeconds,
      justification: schema.ships.justification,
      at: schema.ships.reviewedAt,
      createdAt: schema.ships.createdAt,
    })
    .from(schema.ships)
    .where(isNotNull(schema.ships.pixelsAwarded))
    .orderBy(asc(schema.ships.createdAt))
  const previous = new Map<number, number>()
  return ships.map((s) => {
    const before = previous.get(s.projectId) ?? 0
    const now = s.seconds ?? before
    previous.set(s.projectId, Math.max(before, now))
    const override = s.justification?.overrideHours
    return { at: s.at ?? s.createdAt, hours: override != null ? override : Math.max(0, now - before) / 3600 }
  })
}

export interface StatPoint { at: string, value: number }

// Everything on the admin graphs: its value right now, and its value at the end of each UTC
// day from `from` to `to` (inclusive). Today's point is the value so far.
export async function getStats(from: Date, to: Date) {
  const start = from.getTime()
  const end = to.getTime() + DAY
  const days: number[] = []
  for (let t = start; t < end; t += DAY) days.push(t)
  const db = useDB()

  const dayKey = (col: ReturnType<typeof sql>) => sql<Date>`date_trunc('day', ${col} at time zone 'UTC') at time zone 'UTC'`.mapWith((v) => new Date(v))

  // A running total of `amount` for each day: what there was before `start`, plus each day's change
  const running = (before: number, changes: Map<number, number>) => {
    let total = before
    return days.map((t) => {
      total += changes.get(t) ?? 0
      return { at: new Date(t).toISOString(), value: total } satisfies StatPoint
    })
  }
  const byDay = (rows: { day: Date, n: number | string | null }[]) =>
    new Map(rows.map((r) => [new Date(r.day).getTime(), Number(r.n ?? 0)]))

  const countSeries = async (table: typeof schema.users | typeof schema.projects) => {
    const created = table.createdAt
    const [[before], rows] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(table).where(lt(created, new Date(start))),
      db.select({ day: dayKey(sql`${created}`), n: sql<number>`count(*)::int` }).from(table)
        .where(and(gte(created, new Date(start)), lt(created, new Date(end)))).groupBy(sql`1`),
    ])
    return running(before!.n, byDay(rows))
  }

  const balanceSeries = async (table: typeof schema.pixelTransactions | typeof schema.bonusPointTransactions) => {
    const [[before], rows] = await Promise.all([
      db.select({ n: sql<number>`coalesce(sum(${table.amount}), 0)::bigint` }).from(table).where(lt(table.createdAt, new Date(start))),
      db.select({ day: dayKey(sql`${table.createdAt}`), n: sql<number>`sum(${table.amount})::bigint` }).from(table)
        .where(and(gte(table.createdAt, new Date(start)), lt(table.createdAt, new Date(end)))).groupBy(sql`1`),
    ])
    return running(Number(before!.n), byDay(rows))
  }

  const [users, projects, pixels, bonusPoints, paid, snapshots, [balances], [userCount, projectCount], unshippedNow] = await Promise.all([
    countSeries(schema.users),
    countSeries(schema.projects),
    balanceSeries(schema.pixelTransactions),
    balanceSeries(schema.bonusPointTransactions),
    paidShipHours(),
    // Includes the last one before the range, which is what a day without one carries forward
    Promise.all([
      db.select().from(schema.statSnapshots).where(and(gte(schema.statSnapshots.hour, new Date(start)), lt(schema.statSnapshots.hour, new Date(end)))).orderBy(asc(schema.statSnapshots.hour)),
      db.select().from(schema.statSnapshots).where(lt(schema.statSnapshots.hour, new Date(start))).orderBy(desc(schema.statSnapshots.hour)).limit(1),
    ]),
    db.select({
      pixels: sql<number>`coalesce(sum(${schema.users.pixels}), 0)::bigint`,
      bonusPoints: sql<number>`coalesce(sum(${schema.users.bonusPoints}), 0)::bigint`,
    }).from(schema.users),
    Promise.all([db.$count(schema.users), db.$count(schema.projects)]),
    unshippedSecondsNow(),
  ])

  // Shipped hours: a running total by when each ship was approved
  const shippedChanges = new Map<number, number>()
  let shippedBefore = 0
  let shippedNow = 0
  for (const s of paid) {
    const t = s.at.getTime()
    shippedNow += s.hours
    if (t < start) shippedBefore += s.hours
    else if (t < end) {
      const key = Math.floor(t / DAY) * DAY
      shippedChanges.set(key, (shippedChanges.get(key) ?? 0) + s.hours)
    }
  }

  // Unshipped hours: the last snapshot before the end of each day
  const [inRange, [beforeRange]] = snapshots
  let carried = beforeRange ? beforeRange.unshippedSeconds : 0
  let i = 0
  const unshipped = days.map((t) => {
    while (i < inRange.length && inRange[i]!.hour.getTime() < t + DAY) carried = inRange[i++]!.unshippedSeconds
    return { at: new Date(t).toISOString(), value: round(carried / 3600) }
  })
  // Today hasn't ended, so its point is the value now
  if (days.at(-1) === Math.floor(Date.now() / DAY) * DAY) unshipped[unshipped.length - 1]!.value = round(unshippedNow / 3600)

  return {
    current: {
      users: userCount,
      projects: projectCount,
      unshippedHours: round(unshippedNow / 3600),
      shippedHours: round(shippedNow),
      pixels: Number(balances!.pixels),
      bonusPoints: Number(balances!.bonusPoints),
    },
    users,
    projects,
    unshippedHours: unshipped,
    shippedHours: running(shippedBefore, shippedChanges).map((p) => ({ ...p, value: round(p.value) })),
    pixels,
    bonusPoints,
  }
}

const round = (n: number) => Math.round(n * 10) / 10
