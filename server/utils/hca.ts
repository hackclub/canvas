import { eq } from 'drizzle-orm'

// Reading from Hack Club Auth with the token saved at the user's last sign-in
// (https://auth.hackclub.com/docs/api)
const HCA_URL = 'https://auth.hackclub.com'

export interface HcaAddress {
  id: string
  first_name?: string
  last_name?: string
  line_1?: string
  line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  phone_number?: string
  primary?: boolean
}

// Identity from GET /api/v1/me, with the scopes /auth/hackclub requests
export interface HcaIdentity {
  first_name?: string
  last_name?: string
  primary_email?: string
  birthday?: string
  addresses?: HcaAddress[]
}

export async function fetchHcaIdentity(token: string) {
  const { identity } = await $fetch<{ identity: HcaIdentity }>(
    `${HCA_URL}/api/v1/me`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return identity
}

// The user's addresses on Hack Club Auth, primary first. Errors say to sign in again if
// their saved token is missing (users from before it was saved) or doesn't work any more.
export async function fetchHcaAddresses(userId: string) {
  const user = await useDB().query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { hca: true },
  })
  const signInAgain = createError({ statusCode: 409, statusMessage: 'Sign in again to load your addresses' })
  if (!user?.hca) throw signInAgain

  let identity: HcaIdentity
  try {
    identity = await fetchHcaIdentity(decryptToken(user.hca.access_token))
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status === 401 || status === 403) throw signInAgain
    console.error('Failed to load addresses from Hack Club Auth:', error)
    throw createError({ statusCode: 502, statusMessage: "Couldn't reach Hack Club Auth, try again in a bit" })
  }
  const addresses = identity.addresses ?? []
  return addresses.sort((a, b) => Number(!!b.primary) - Number(!!a.primary))
}

export function toShippingAddress(address: HcaAddress): ShippingAddress {
  return {
    firstName: address.first_name ?? '',
    lastName: address.last_name ?? '',
    line1: address.line_1 ?? '',
    line2: address.line_2 ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    postalCode: address.postal_code ?? '',
    country: address.country ?? '',
    phoneNumber: address.phone_number?.trim() ?? '',
  }
}
