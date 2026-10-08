import { and, count, eq, isNotNull, isNull, sql } from 'drizzle-orm'

// Pixels for each person you refer who becomes verified & eligible and draws on the canvas
export const REFERRAL_PIXELS = 2
// Most referrals one person can be paid for
export const REFERRAL_CAP = 25

// Referral codes are random, lowercase and easy to read out, without lookalikes (0/o, 1/l)
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const CODE_LENGTH = 8
export const REFERRAL_CODE_PATTERN = /^[a-z0-9]{6,16}$/

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

// The user's referral code, made the first time it's needed
export async function getReferralCode(userId: string) {
  const db = useDB()
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { referralCode: true } })
  if (row?.referralCode) return row.referralCode

  for (let attempt = 0; attempt < 5; attempt++) {
    // Only sets it if still empty, so two requests at once end up with the same code
    const [updated] = await db
      .update(schema.users)
      .set({ referralCode: randomCode() })
      .where(and(eq(schema.users.id, userId), isNull(schema.users.referralCode)))
      .returning({ referralCode: schema.users.referralCode })
      .catch((e) => {
        // The random code is already someone's, try another
        if ((e?.cause?.code ?? e?.code) === '23505') return []
        throw e
      })
    if (updated) return updated.referralCode!
    const current = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { referralCode: true } })
    if (current?.referralCode) return current.referralCode
  }
  throw createError({ statusCode: 500, statusMessage: 'Could not make a referral code' })
}

// Records who referred a user who has just signed up for the first time. Ignores codes that
// don't exist and the user's own code.
export async function setReferrer(userId: string, code: string) {
  if (!REFERRAL_CODE_PATTERN.test(code)) return
  const db = useDB()
  const referrer = await db.query.users.findFirst({ where: eq(schema.users.referralCode, code), columns: { id: true } })
  if (!referrer || referrer.id === userId) return
  await db
    .update(schema.users)
    .set({ referredBy: referrer.id })
    .where(and(eq(schema.users.id, userId), isNull(schema.users.referredBy)))
}

// Pays whoever referred this user, if they've now become verified & eligible and drawn on the
// canvas. Safe to call whenever either might have happened: the user's row is claimed in one
// update, so the referrer is only ever paid once for them.
export async function payReferral(userId: string) {
  try {
    await useDB().transaction(async (tx) => {
      const user = await tx.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: { referredBy: true, referralRewardedAt: true },
      })
      if (!user?.referredBy || user.referralRewardedAt) return

      // Locks the referrer, so referrals qualifying at the same moment are counted one at a
      // time and can't go over the cap together
      await tx.select({ id: schema.users.id }).from(schema.users)
        .where(eq(schema.users.id, user.referredBy)).for('update')
      const [paid] = await tx.select({ n: count() }).from(schema.users)
        .where(and(eq(schema.users.referredBy, user.referredBy), isNotNull(schema.users.referralRewardedAt)))
      if (paid!.n >= REFERRAL_CAP) return

      const [claimed] = await tx
        .update(schema.users)
        .set({ referralRewardedAt: new Date() })
        .where(and(
          eq(schema.users.id, userId),
          isNotNull(schema.users.referredBy),
          isNull(schema.users.referralRewardedAt),
          eq(schema.users.verificationStatus, 'verified'),
          eq(schema.users.yswsEligible, true),
          sql`exists (select 1 from ${schema.canvasPixelLog} where ${schema.canvasPixelLog.userId} = ${schema.users.id})`,
        ))
        .returning({ referrer: schema.users.referredBy })
      if (!claimed?.referrer) return

      const [balances] = await tx
        .update(schema.users)
        .set({ pixels: sql`${schema.users.pixels} + ${REFERRAL_PIXELS}` })
        .where(eq(schema.users.id, claimed.referrer))
        .returning({ pixels: schema.users.pixels })
      await tx.insert(schema.pixelTransactions).values({
        userId: claimed.referrer,
        amount: REFERRAL_PIXELS,
        balance: balances!.pixels,
        reason: 'referral',
      })
    })
  } catch (e) {
    // Never fail a sign-in or a drawing over a referral, it's picked up the next time
    console.error('Failed to pay referral', e)
  }
}
