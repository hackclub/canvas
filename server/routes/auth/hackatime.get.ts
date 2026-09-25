import { eq } from 'drizzle-orm'

// GET /auth/hackatime — links a Hackatime account (https://hackatime.hackclub.com/docs/oauth/oauth-apps)
// Not a sign-in method: the user must already be signed in with Hack Club Auth.
// Without a `code` it redirects to Hackatime; Hackatime then redirects back here with one.
const HACKATIME_URL = 'https://hackatime.hackclub.com'
const SCOPES = 'profile read admin'
const STATE_COOKIE = 'hackatime_oauth_state'
const SETUP_PAGE = '/app/setup/hackatime'

interface TokenResponse {
  access_token: string
  // Unix timestamp (seconds)
  created_at: number
}

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const { hackatime } = useRuntimeConfig(event)
  const { code, state, error } = getQuery(event)
  const redirectUri = new URL('/auth/hackatime', getRequestURL(event)).href

  if (error) {
    return sendRedirect(event, SETUP_PAGE)
  }

  // Step 1: send the user to Hackatime
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
      client_id: hackatime.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
    })
    return sendRedirect(event, `${HACKATIME_URL}/oauth/authorize?${params}`)
  }

  // Step 2: back from Hackatime, verify state and exchange the code
  const expectedState = getCookie(event, STATE_COOKIE)
  deleteCookie(event, STATE_COOKIE, { path: '/auth' })
  if (!expectedState || state !== expectedState) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' })
  }

  const token = await $fetch<TokenResponse>(`${HACKATIME_URL}/oauth/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: hackatime.clientId,
      client_secret: hackatime.clientSecret,
      redirect_uri: redirectUri,
      code: String(code),
    }),
  })

  // Tokens are long-lived (~16 years) and have no refresh flow, so storing it once is enough
  await useDB()
    .update(schema.users)
    .set({
      hackatime: {
        access_token: token.access_token,
        created_at: new Date(token.created_at * 1000).toISOString(),
      },
    })
    .where(eq(schema.users.id, user.id))
  return sendRedirect(event, SETUP_PAGE)
})
