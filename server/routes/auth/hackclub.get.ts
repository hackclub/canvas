import { sql } from 'drizzle-orm'

// GET /auth/hackclub — Hack Club Auth OAuth flow (https://auth.hackclub.com/docs/oauth-guide)
// Without a `code` it redirects to Hack Club Auth; Hack Club Auth then redirects back here with one.
const HCA_URL = 'https://auth.hackclub.com'
const SCOPES = 'openid email name slack_id'
const STATE_COOKIE = 'hca_oauth_state'

interface TokenResponse {
  access_token: string
}

interface MeResponse {
  identity: AuthUser
}

export default defineEventHandler(async (event) => {
  const { hca } = useRuntimeConfig(event)
  const { code, state, error } = getQuery(event)
  const redirectUri = new URL('/auth/hackclub', getRequestURL(event)).href

  if (error) {
    return sendRedirect(event, '/')
  }

  // Step 1: send the user to Hack Club Auth
  if (!code) {
    const state = crypto.randomUUID()
    setCookie(event, STATE_COOKIE, state, {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'lax',
      path: '/auth',
      maxAge: 60 * 10,
    })

    const params = new URLSearchParams({
      client_id: hca.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
    })
    return sendRedirect(event, `${HCA_URL}/oauth/authorize?${params}`)
  }

  // Step 2: back from Hack Club Auth, verify state and exchange the code
  const expectedState = getCookie(event, STATE_COOKIE)
  deleteCookie(event, STATE_COOKIE, { path: '/auth' })
  if (!expectedState || state !== expectedState) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' })
  }

  const token = await $fetch<TokenResponse>(`${HCA_URL}/oauth/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: hca.clientId,
      client_secret: hca.clientSecret,
      redirect_uri: redirectUri,
      code: String(code),
    }),
  })

  const { identity } = await $fetch<MeResponse>(`${HCA_URL}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })

  // Keep the stored name in sync with Hack Club Auth on every sign-in
  const userIdentity = { first_name: identity.first_name, last_name: identity.last_name }
  const slackId = identity.slack_id || null
  const [dbUser] = await useDB()
    .insert(schema.users)
    .values({ id: identity.id, identity: userIdentity, slackId })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        // Merge so fields added to `identity` later aren't wiped
        identity: sql`${schema.users.identity} || ${JSON.stringify(userIdentity)}::jsonb`,
        slackId,
      },
    })
    .returning({ isAdmin: schema.users.isAdmin })

  await setUserSession(event, { user: { ...identity, isAdmin: dbUser!.isAdmin } })
  return sendRedirect(event, '/app')
})
