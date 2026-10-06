// Rejects requests that change something unless they come from this site. The session
// cookie is SameSite=Lax, but that treats other *.hackclub.com sites as the same site, so
// browsers also say where a request came from (Origin, Sec-Fetch-Site) and it's checked here.
// Requests without either header aren't from a browser, so they have no cookie to abuse.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler((event) => {
  if (SAFE_METHODS.has(getMethod(event))) return

  const origin = getRequestHeader(event, 'origin')
  if (origin) {
    const { siteUrl } = useRuntimeConfig(event)
    const allowed = [getRequestHost(event, { xForwardedHost: true })]
    if (siteUrl) allowed.push(new URL(siteUrl).host)

    let originHost: string | undefined
    try {
      originHost = new URL(origin).host
    } catch {
      // "null" and other junk fall through to the rejection below
    }
    if (!originHost || !allowed.includes(originHost)) {
      throw createError({ statusCode: 403, statusMessage: 'Cross-site request blocked' })
    }
    return
  }

  const site = getRequestHeader(event, 'sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request blocked' })
  }
})
