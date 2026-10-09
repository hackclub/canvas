import { eq, sql } from 'drizzle-orm'

// Pixels per whole hour coded, paid as the time shows up in Hackatime. Separate from, and in
// addition to, what shipping pays (server/utils/payouts.ts).
export const CODING_PIXELS_PER_HOUR = 10

// Hackatime is only ever called from syncCodingPixels, i.e. when the user asks for their
// progress, and at most once per user per SYNC_INTERVAL (also after a failure, so an outage
// isn't hit on every page load). Concurrent requests from one user share a single call.
const SYNC_INTERVAL = 5 * 60 * 1000
type Totals = Record<string, number>
const lastSync = new Map<string, { at: number, totals: Totals | null }>()
const inFlight = new Map<string, Promise<Totals | null>>()

// Total seconds of each of the user's Hackatime projects by name, or null if Hackatime
// isn't linked or can't be reached
function hackatimeTotals(userId: string): Promise<Totals | null> {
  const cached = lastSync.get(userId)
  if (cached && Date.now() - cached.at < SYNC_INTERVAL) return Promise.resolve(cached.totals)

  let pending = inFlight.get(userId)
  if (!pending) {
    pending = getHackatimeProjects(userId)
      .then((projects) => {
        // Not linked, so Hackatime wasn't called and there's nothing to rate limit
        if (!projects) return null
        const totals = Object.fromEntries(projects.map((p) => [p.name, p.total_seconds]))
        lastSync.set(userId, { at: Date.now(), totals })
        return totals
      })
      .catch(() => {
        lastSync.set(userId, { at: Date.now(), totals: null })
        return null
      })
      .finally(() => inFlight.delete(userId))
    inFlight.set(userId, pending)
  }
  return pending
}

export interface CodingProgress {
  // Whole hours paid for so far
  hoursPaid: number
  // Seconds into the next hour
  secondsIntoHour: number
  pixelsPerHour: number
  // Pixels paid by this call
  awarded: number
}

// Pays pixels for new whole hours of time on Hackatime projects that are linked to one of
// the user's Canvas projects. Time on other Hackatime projects doesn't count, and neither
// does what a linked one had when it was first seen (its baseline), so linking an old
// project doesn't pay for the past. Returns null if Hackatime isn't linked. Safe to call
// often: the Hackatime call is rate limited per user and the payout is made under a row
// lock, so hours are never paid twice.
export async function syncCodingPixels(userId: string): Promise<CodingProgress | null> {
  const totals = await hackatimeTotals(userId)
  if (totals === null) return null

  return useDB().transaction(async (tx) => {
    const [row] = await tx
      .select({
        baselines: schema.users.codingBaselines,
        seen: schema.users.codingSeen,
        paid: schema.users.codingHoursPaid,
        linked: schema.users.hackatimeId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .for('update')
    if (!row?.linked) return null

    const projects = await tx
      .select({ hackatimeProjects: schema.projects.hackatimeProjects })
      .from(schema.projects)
      .where(eq(schema.projects.userId, userId))
    const linked = new Set(projects.flatMap((p) => p.hackatimeProjects))

    // Remember where each newly linked project was. Ones that are unlinked later keep theirs,
    // so relinking doesn't pay again for time already counted.
    const baselines = { ...row.baselines }
    let baselinesChanged = false
    for (const name of linked) {
      if (name in totals && !(name in baselines)) {
        baselines[name] = totals[name]!
        baselinesChanged = true
      }
    }
    if (baselinesChanged) {
      await tx.update(schema.users).set({ codingBaselines: baselines }).where(eq(schema.users.id, userId))
    }

    let coded = 0
    let linkedSeconds = 0
    for (const name of linked) {
      if (name in totals) linkedSeconds += totals[name]!
      if (name in baselines && name in totals) coded += Math.max(0, totals[name]! - baselines[name]!)
    }

    // Time that came in since the last look, on projects that were already linked then (a
    // newly linked project's earlier time isn't today's), goes on today's coding log
    const seen: Record<string, number> = {}
    let newSeconds = 0
    for (const name of linked) {
      if (!(name in totals)) continue
      seen[name] = totals[name]!
      if (name in row.seen) newSeconds += Math.max(0, totals[name]! - row.seen[name]!)
    }
    await tx.update(schema.users)
      .set({ linkedSecondsSeen: Math.round(linkedSeconds), codingSeen: seen })
      .where(eq(schema.users.id, userId))
    if (newSeconds >= 1) {
      const day = new Date(Math.floor(Date.now() / 86_400_000) * 86_400_000)
      await tx.insert(schema.userCodingDays)
        .values({ userId, day, seconds: Math.round(newSeconds) })
        .onConflictDoUpdate({
          target: [schema.userCodingDays.userId, schema.userCodingDays.day],
          set: { seconds: sql`${schema.userCodingDays.seconds} + ${Math.round(newSeconds)}` },
        })
    }

    const progress = (awarded = 0): CodingProgress => {
      const paidSeconds = (row.paid + awarded / CODING_PIXELS_PER_HOUR) * 3600
      return {
        hoursPaid: paidSeconds / 3600,
        // Unlinking a project can leave less counted than was paid for, which shows as 0
        secondsIntoHour: Math.min(3599, Math.max(0, coded - paidSeconds)),
        pixelsPerHour: CODING_PIXELS_PER_HOUR,
        awarded,
      }
    }

    const newHours = Math.floor(coded / 3600) - row.paid
    if (newHours <= 0) return progress()

    const pixels = newHours * CODING_PIXELS_PER_HOUR
    const [balances] = await tx
      .update(schema.users)
      .set({
        pixels: sql`${schema.users.pixels} + ${pixels}`,
        codingHoursPaid: row.paid + newHours,
      })
      .where(eq(schema.users.id, userId))
      .returning({ pixels: schema.users.pixels })
    await tx.insert(schema.pixelTransactions).values({
      userId,
      amount: pixels,
      balance: balances!.pixels,
      reason: 'coding',
    })
    return progress(pixels)
  })
}
