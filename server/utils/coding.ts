import { eq, sql } from 'drizzle-orm'

// Pixels per whole hour coded, paid as the time shows up in Hackatime. Separate from, and in
// addition to, what shipping pays (server/utils/payouts.ts).
export const CODING_PIXELS_PER_HOUR = 5

// Hackatime is only ever called from syncCodingPixels, i.e. when the user asks for their
// progress, and at most once per user per SYNC_INTERVAL (also after a failure, so an outage
// isn't hit on every page load). Concurrent requests from one user share a single call.
const SYNC_INTERVAL = 5 * 60 * 1000
const lastSync = new Map<string, { at: number, total: number | null }>()
const inFlight = new Map<string, Promise<number | null>>()

// The user's total Hackatime seconds, or null if it isn't linked or Hackatime can't be reached
function hackatimeTotal(userId: string): Promise<number | null> {
  const cached = lastSync.get(userId)
  if (cached && Date.now() - cached.at < SYNC_INTERVAL) return Promise.resolve(cached.total)

  let pending = inFlight.get(userId)
  if (!pending) {
    pending = getHackatimeProjects(userId)
      .then((projects) => {
        // Not linked, so Hackatime wasn't called and there's nothing to rate limit
        if (!projects) return null
        const total = projects.reduce((sum, p) => sum + p.total_seconds, 0)
        lastSync.set(userId, { at: Date.now(), total })
        return total
      })
      .catch(() => {
        lastSync.set(userId, { at: Date.now(), total: null })
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

// Pays pixels for new whole hours of Hackatime time. Only time after the first sync counts
// (the baseline), so hours logged before Canvas aren't paid. Returns null if Hackatime isn't
// linked. Safe to call often: the Hackatime call is rate limited per user and the payout
// is made under a row lock, so hours are never paid twice.
export async function syncCodingPixels(userId: string): Promise<CodingProgress | null> {
  const total = await hackatimeTotal(userId)
  if (total === null) return null

  return useDB().transaction(async (tx) => {
    const [row] = await tx
      .select({
        baseline: schema.users.codingBaselineSeconds,
        paid: schema.users.codingHoursPaid,
        linked: schema.users.hackatimeId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .for('update')
    if (!row?.linked) return null

    const progress = (seconds: number, awarded = 0): CodingProgress => ({
      hoursPaid: row.paid + awarded / CODING_PIXELS_PER_HOUR,
      secondsIntoHour: seconds % 3600,
      pixelsPerHour: CODING_PIXELS_PER_HOUR,
      awarded,
    })

    if (row.baseline === null) {
      await tx.update(schema.users).set({ codingBaselineSeconds: total }).where(eq(schema.users.id, userId))
      return progress(0)
    }

    const coded = Math.max(0, total - row.baseline)
    const newHours = Math.floor(coded / 3600) - row.paid
    if (newHours <= 0) return progress(coded)

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
    return progress(coded, pixels)
  })
}
