import { and, eq, isNotNull, max, ne, sql } from 'drizzle-orm'

import type { ShipJustification } from '../../shared/types/ships'

type Tx = Parameters<Parameters<ReturnType<typeof useDB>['transaction']>[0]>[0]

const BONUS_POINTS_PER_HOUR = 10
// Pixels per hour for a project's first PIXEL_TIER_HOURS hours, then PIXELS_PER_HOUR_AFTER
const PIXELS_PER_HOUR = 10
// Reviewers can mark a ship as "cooking" to pay it extra pixels
export const COOKING_MULTIPLIER = 1.2
const PIXEL_TIER_HOURS = 10
const PIXELS_PER_HOUR_AFTER = 5

// What a project has earned in total for `seconds` of Hackatime time. Each ship pays the
// difference between this at its time and at the last paid ship's, so a project's hours
// are only ever paid once and the 10 hour tier counts across all of its ships.
export function projectEarnings(seconds: number) {
  const hours = Math.max(0, seconds) / 3600
  return {
    // e.g. 1.5 hours is 15 points, 1.26 hours is 13
    bonusPoints: Math.round(hours * BONUS_POINTS_PER_HOUR),
    // Rounded up, e.g. 1.1 hours is 6 pixels
    pixels: Math.ceil(
      Math.min(hours, PIXEL_TIER_HOURS) * PIXELS_PER_HOUR
      + Math.max(0, hours - PIXEL_TIER_HOURS) * PIXELS_PER_HOUR_AFTER,
    ),
  }
}

// Pays out an approved ship that hasn't been paid yet: pixels and bonus points for the
// project's time since its last paid ship. `seconds` is the project's total time for this
// ship (or the reviewer's override hours are used instead). Run it in the same transaction that approved the ship. Returns what was paid.
export async function payShip(tx: Tx, ship: { id: number, projectId: number, cooking: boolean, justification: ShipJustification | null }, ownerId: string, seconds: number) {
  // The time the project's earlier ships were paid for
  const [previous] = await tx
    .select({ seconds: max(schema.ships.hackatimeSeconds) })
    .from(schema.ships)
    .where(and(
      eq(schema.ships.projectId, ship.projectId),
      ne(schema.ships.id, ship.id),
      isNotNull(schema.ships.pixelsAwarded),
    ))
  const before = projectEarnings(previous?.seconds ?? 0)
  // A reviewer's hour override replaces the hours this ship is paid for, on top of what
  // earlier ships were paid for. The ship's recorded Hackatime time is left as it is.
  const overrideHours = ship.justification?.overrideHours
  const now = projectEarnings(overrideHours != null ? (previous?.seconds ?? 0) + overrideHours * 3600 : seconds)
  // Time can go down if a Hackatime project gets unlinked, which shouldn't take anything away
  const earned = Math.max(0, now.pixels - before.pixels)
  // Only this ship's pixels are multiplied, not ones from earlier ships; rounded up like the rest
  const pixels = ship.cooking ? Math.ceil(earned * COOKING_MULTIPLIER) : earned
  const bonusPoints = Math.max(0, now.bonusPoints - before.bonusPoints)

  await tx
    .update(schema.ships)
    .set({
      hackatimeSeconds: seconds,
      pixelsAwarded: pixels,
      bonusPointsAwarded: bonusPoints,
    })
    .where(eq(schema.ships.id, ship.id))

  if (pixels || bonusPoints) {
    const [balances] = await tx
      .update(schema.users)
      .set({
        pixels: sql`${schema.users.pixels} + ${pixels}`,
        bonusPoints: sql`${schema.users.bonusPoints} + ${bonusPoints}`,
      })
      .where(eq(schema.users.id, ownerId))
      .returning({ pixels: schema.users.pixels, bonusPoints: schema.users.bonusPoints })
    if (pixels) {
      await tx.insert(schema.pixelTransactions).values({
        userId: ownerId,
        amount: pixels,
        balance: balances!.pixels,
        reason: 'ship',
        shipId: ship.id,
      })
    }
    if (bonusPoints) {
      await tx.insert(schema.bonusPointTransactions).values({
        userId: ownerId,
        amount: bonusPoints,
        balance: balances!.bonusPoints,
        reason: 'ship',
        shipId: ship.id,
      })
    }
  }
  return { pixels, bonusPoints }
}
