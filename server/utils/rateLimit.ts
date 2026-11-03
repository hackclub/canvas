import type { H3Event } from 'h3'

// A fixed-window rate limiter kept in memory, per process (like the canvas board, this assumes
// a single server). Each `name` is its own bucket of windows, so routes don't share limits.
// `rateLimit` throws a 429 with a Retry-After header once an identity goes over.
interface Window { count: number, resetAt: number }
const buckets = new Map<string, Map<string, Window>>()

// Old windows are dropped now and then so the maps don't grow forever
const PRUNE_INTERVAL = 60_000
let lastPrune = 0

function prune(now: number) {
  if (now - lastPrune < PRUNE_INTERVAL) return
  lastPrune = now
  for (const [name, windows] of buckets) {
    for (const [id, w] of windows) if (w.resetAt <= now) windows.delete(id)
    if (!windows.size) buckets.delete(name)
  }
}

// Who a request is from: the signed-in user, or the client's IP for anyone else. The IP is
// taken from X-Forwarded-For, since the app runs behind a reverse proxy.
async function requestIdentity(event: H3Event) {
  const { user } = await getUserSession(event)
  if (user) return `user:${user.id}`
  return `ip:${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}`
}

// Counts a hit for `id` against `name`'s window. Returns how many seconds until the window
// resets if it's now over `limit` hits per `windowMs`, or null if it's still within the limit.
function hit(name: string, id: string, limit: number, windowMs: number) {
  const now = Date.now()
  prune(now)
  let windows = buckets.get(name)
  if (!windows) buckets.set(name, windows = new Map())
  let w = windows.get(id)
  if (!w || w.resetAt <= now) windows.set(id, w = { count: 0, resetAt: now + windowMs })
  w.count++
  if (w.count <= limit) return null
  return Math.max(1, Math.ceil((w.resetAt - now) / 1000))
}

function tooMany(event: H3Event, retryAfter: number) {
  setResponseHeader(event, 'Retry-After', String(retryAfter))
  return createError({ statusCode: 429, statusMessage: 'Too many requests, slow down a little' })
}

// Rate limits the request by the signed-in user (or IP) for a route. Call it after
// requireUserSession, so unauthenticated requests are rejected first.
export async function rateLimit(event: H3Event, name: string, limit: number, windowMs: number) {
  const retryAfter = hit(name, await requestIdentity(event), limit, windowMs)
  if (retryAfter !== null) throw tooMany(event, retryAfter)
}

// Rate limits the request by the client's IP, for routes that run before anyone is signed in
export function rateLimitByIp(event: H3Event, name: string, limit: number, windowMs: number) {
  const retryAfter = hit(name, `ip:${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}`, limit, windowMs)
  if (retryAfter !== null) throw tooMany(event, retryAfter)
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
