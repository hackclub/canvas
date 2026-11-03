import { eq, sql } from 'drizzle-orm'

// Pixels for every whole 15 minutes coded (a "drop"), paid as the time shows up in Hackatime.
// Separate from, and in addition to, what shipping pays (server/utils/payouts.ts).
export const CODING_PIXELS_PER_DROP = 5
export const CODING_DROP_SECONDS = 15 * 60

// Hackatime is only ever called from syncCodingPixels, i.e. when the user asks for their
// progress, and at most once per user per SYNC_INTERVAL (also after a failure, so an outage
// isn't hit on every page load). Concurrent requests from one user share a single call.
const SYNC_INTERVAL = 5 * 60 * 1000
type Totals = Record<string, number>
const lastSync = new Map<string, { at: number, totals: Totals | null }>()
const inFlight = new Map<string, Promise<Totals | null>>()

// Drops what's cached for a user, for when they link a different Hackatime account
export function forgetHackatimeTotals(userId: string) {
  lastSync.delete(userId)
}

// Hackatime project names are used as keys of plain objects (totals, baselines, codingSeen), so
// a project called "constructor" or "toString" would be found by `in` without ever being set
const has = (record: Record<string, number>, key: string) => Object.hasOwn(record, key)

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
  // Hours paid for so far, in whole drops (e.g. 1.25)
  hoursPaid: number
  // Seconds into the next drop
  secondsIntoDrop: number
  dropSeconds: number
  pixelsPerDrop: number
  pixelsPerHour: number
  // Pixels paid by this call
  awarded: number
}

// Pays pixels for new whole drops (15 minutes) of time on Hackatime projects that are linked to one of
// the user's Canvas projects. Time on other Hackatime projects doesn't count, and neither
// does what a linked one had when it was first seen (its baseline), so linking an old
// project doesn't pay for the past. Returns null if Hackatime isn't linked. Safe to call
// often: the Hackatime call is rate limited per user and the payout is made under a row
// lock, so time is never paid twice.
export async function syncCodingPixels(userId: string): Promise<CodingProgress | null> {
  const totals = await hackatimeTotals(userId)
  if (totals === null) return null

  return useDB().transaction(async (tx) => {
    const [row] = await tx
      .select({
        baselines: schema.users.codingBaselines,
        seen: schema.users.codingSeen,
        paid: schema.users.codingQuartersPaid,
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
      if (has(totals, name) && !has(baselines, name)) {
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
      if (!has(totals, name)) continue
      linkedSeconds += totals[name]!
      if (has(baselines, name)) coded += Math.max(0, totals[name]! - baselines[name]!)
    }

    // Time that came in since the last look, on projects that were already linked then (a
    // newly linked project's earlier time isn't today's), goes on today's coding log
    const seen: Record<string, number> = {}
    let newSeconds = 0
    for (const name of linked) {
      if (!has(totals, name)) continue
      seen[name] = totals[name]!
      if (has(row.seen, name)) newSeconds += Math.max(0, totals[name]! - row.seen[name]!)
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
      const paidSeconds = (row.paid + awarded / CODING_PIXELS_PER_DROP) * CODING_DROP_SECONDS
      return {
        hoursPaid: paidSeconds / 3600,
        // Unlinking a project can leave less counted than was paid for, which shows as 0
        secondsIntoDrop: Math.min(CODING_DROP_SECONDS - 1, Math.max(0, coded - paidSeconds)),
        dropSeconds: CODING_DROP_SECONDS,
        pixelsPerDrop: CODING_PIXELS_PER_DROP,
        pixelsPerHour: CODING_PIXELS_PER_DROP * (3600 / CODING_DROP_SECONDS),
        awarded,
      }
    }

    const newDrops = Math.floor(coded / CODING_DROP_SECONDS) - row.paid
    if (newDrops <= 0) return progress()

    const pixels = newDrops * CODING_PIXELS_PER_DROP
    const [balances] = await tx
      .update(schema.users)
      .set({
        pixels: sql`${schema.users.pixels} + ${pixels}`,
        codingQuartersPaid: row.paid + newDrops,
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
