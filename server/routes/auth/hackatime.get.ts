import { and, eq, isNotNull, ne } from 'drizzle-orm'

// GET /auth/hackatime — links a Hackatime account (https://hackatime.hackclub.com/docs/oauth/oauth-apps)
// Not a sign-in method: the user must already be signed in with Hack Club Auth.
// Without a `code` it redirects to Hackatime; Hackatime then redirects back here with one.
const HACKATIME_URL = 'https://hackatime.hackclub.com'
// Canvas only reads profile and project data, so it doesn't ask for `admin`
const SCOPES = 'profile read'
const STATE_COOKIE = 'hackatime_oauth_state'
const RETURN_COOKIE = 'hackatime_oauth_return'
const SETUP_PAGE = '/app/setup/hackatime'
// Pages allowed as `?return_to=`, so this can't be used as an open redirect
const RETURN_PAGES = [SETUP_PAGE, '/app/me']

interface TokenResponse {
  access_token: string
  // Unix timestamp (seconds)
  created_at: number
}

interface MeResponse {
  id: number
}

function alreadyLinked() {
  return createError({
    statusCode: 409,
    statusMessage: 'That Hackatime account is already linked to another Canvas account',
  })
}

// Postgres unique_violation, which Drizzle wraps in an error with the driver's error as `cause`
function isUniqueViolation(error: unknown) {
  const { code, cause } = error as { code?: string, cause?: { code?: string } }
  return (cause?.code ?? code) === '23505'
}

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const { hackatime } = useRuntimeConfig(event)
  const { code, state, error, return_to } = getQuery(event)
  const redirectUri = new URL('/auth/hackatime', getRequestURL(event)).href

  const returnCookie = getCookie(event, RETURN_COOKIE)
  const returnPage = returnCookie && RETURN_PAGES.includes(returnCookie) ? returnCookie : SETUP_PAGE

  if (error) {
    deleteCookie(event, RETURN_COOKIE, { path: '/auth' })
    return sendRedirect(event, returnPage)
  }

  // Step 1: send the user to Hackatime
  if (!code) {
    const cookieOptions = {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'lax',
      path: '/auth',
      maxAge: 60 * 10,
    } as const
    const state = crypto.randomUUID()
    setCookie(event, STATE_COOKIE, state, cookieOptions)
    const returnTo = String(return_to ?? '')
    setCookie(event, RETURN_COOKIE, RETURN_PAGES.includes(returnTo) ? returnTo : SETUP_PAGE, cookieOptions)

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
  deleteCookie(event, RETURN_COOKIE, { path: '/auth' })
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

  // Needs the `profile` scope
  const me = await $fetch<MeResponse>(`${HACKATIME_URL}/api/v1/authenticated/me`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })

  const db = useDB()

  // A Hackatime account can only be linked to one Canvas account, or several accounts
  // could each be paid for the same hours
  const taken = await db.query.users.findFirst({
    where: and(eq(schema.users.hackatimeId, me.id), ne(schema.users.id, user.id)),
    columns: { id: true },
  })
  if (taken) throw alreadyLinked()

  // Once hours have been paid out, switching to a different Hackatime account would let
  // them be paid again, so the account can't be changed after that
  const current = await db.query.users.findFirst({
    where: eq(schema.users.id, user.id),
    columns: { hackatimeId: true, codingQuartersPaid: true },
  })
  const switching = !!current?.hackatimeId && current.hackatimeId !== me.id
  if (switching) {
    const [paid] = await db
      .select({ id: schema.ships.id })
      .from(schema.ships)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
      .where(and(eq(schema.projects.userId, user.id), isNotNull(schema.ships.pixelsAwarded)))
      .limit(1)
    if (paid || current!.codingQuartersPaid > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: "You've already been paid for time from another Hackatime account, so it can't be changed",
      })
    }
  }

  // Tokens are long-lived (~16 years) and have no refresh flow, so storing it once is enough
  try {
    await db
      .update(schema.users)
      .set({
        hackatime: {
          access_token: encryptToken(token.access_token),
          created_at: new Date(token.created_at * 1000).toISOString(),
        },
        hackatimeId: me.id,
        // A different account starts pay-as-you-code from scratch (nothing was paid on the old one)
        ...(switching ? { codingBaselines: {} } : {}),
      })
      .where(eq(schema.users.id, user.id))
  } catch (error) {
    // Lost a race with another account linking the same Hackatime account
    if (isUniqueViolation(error)) throw alreadyLinked()
    throw error
  }
  // Their projects carry their Hackatime ID too (see schema.projects.hackatimeId)
  await db
    .update(schema.projects)
    .set({ hackatimeId: me.id })
    .where(eq(schema.projects.userId, user.id))

  return sendRedirect(event, returnPage)
})
