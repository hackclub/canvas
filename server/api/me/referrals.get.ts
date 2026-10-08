import { and, count, eq, isNotNull, sum } from 'drizzle-orm'

// GET /api/me/referrals — the user's referral link and how their referrals are going
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const code = await getReferralCode(user.id)
  const db = useDB()

  const [[signedUp], [qualified], [earned]] = await Promise.all([
    db.select({ n: count() }).from(schema.users).where(eq(schema.users.referredBy, user.id)),
    db.select({ n: count() }).from(schema.users)
      .where(and(eq(schema.users.referredBy, user.id), isNotNull(schema.users.referralRewardedAt))),
    db.select({ n: sum(schema.pixelTransactions.amount) }).from(schema.pixelTransactions)
      .where(and(eq(schema.pixelTransactions.userId, user.id), eq(schema.pixelTransactions.reason, 'referral'))),
  ])

  // From config rather than request headers, which the sender can set (X-Forwarded-Host)
  const siteUrl = useRuntimeConfig(event).siteUrl || getRequestURL(event).origin
  return {
    link: new URL(`/?ref=${code}`, siteUrl).href,
    pixelsPerReferral: REFERRAL_PIXELS,
    cap: REFERRAL_CAP,
    signedUp: signedUp!.n,
    qualified: qualified!.n,
    pixelsEarned: Number(earned?.n ?? 0),
  }
})
