import { eq } from 'drizzle-orm'

export interface Eligibility {
  verificationStatus: string | null
  yswsEligible: boolean | null
}

// Verified and eligible for YSWS programs, needed to ship projects
export const isEligible = (e: Eligibility) => e.verificationStatus === 'verified' && e.yswsEligible === true

export async function getEligibility(userId: string): Promise<Eligibility> {
  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { verificationStatus: true, yswsEligible: true },
  })
  return row ?? { verificationStatus: null, yswsEligible: null }
}

const lastRefresh = new Map<string, number>()

// Asks Hack Club Auth again, with the token saved at sign-in, for people who were verified
// after signing in. At most once a minute per user. Returns what's saved if the token is
// missing, has no verification scope (they need to sign in again) or Hack Club Auth fails.
export async function refreshEligibility(userId: string): Promise<Eligibility> {
  const last = lastRefresh.get(userId)
  if (last && Date.now() - last < 60_000) return getEligibility(userId)
  lastRefresh.set(userId, Date.now())

  const row = await useDB().query.users.findFirst({ where: eq(schema.users.id, userId), columns: { hca: true } })
  if (!row?.hca) return getEligibility(userId)
  try {
    const { identity } = await $fetch<{ identity: { verification_status?: string, ysws_eligible?: boolean } }>(
      'https://auth.hackclub.com/api/v1/me',
      { headers: { Authorization: `Bearer ${decryptToken(row.hca.access_token)}` } },
    )
    if (identity.verification_status) {
      await useDB()
        .update(schema.users)
        .set({
          verificationStatus: identity.verification_status as typeof schema.users.$inferInsert['verificationStatus'],
          yswsEligible: identity.ysws_eligible ?? false,
        })
        .where(eq(schema.users.id, userId))
    }
  } catch (e) {
    console.error('Eligibility refresh failed:', e)
  }
  return getEligibility(userId)
}
