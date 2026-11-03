// Request limits and response headers for every request:
// - bodies are capped before any route buffers them (readBody reads the whole thing into
//   memory). Image uploads get more room, and check the size themselves (readBannerUpload).
// - a broad per-user (or per-IP) limit on API requests, as a safety net behind the tighter
//   limits on the expensive routes (see server/utils/rateLimit.ts)
// - headers that stop the site being framed (clickjacking on the canvas), content sniffing
//   and referrer leaks to the links people put on their projects
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const MAX_JSON_BODY = 1024 * 1024
// The 10 MB image plus multipart overhead
const MAX_UPLOAD_BODY = 11 * 1024 * 1024
// Requests per minute per signed-in user (or IP) across all of /api
const API_LIMIT = 600

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  })

  const { pathname } = getRequestURL(event)
  const method = getMethod(event)
  const isApi = pathname.startsWith('/api/')
  const isAuth = pathname.startsWith('/auth/')
  if (!isApi && !isAuth) return

  if (BODY_METHODS.has(method)) {
    const header = getRequestHeader(event, 'content-length')
    const length = header === undefined ? undefined : Number(header)
    const multipart = (getRequestHeader(event, 'content-type') ?? '').startsWith('multipart/form-data')
    // Without a length the body could go on forever before any route's check applies
    if (length === undefined || !Number.isInteger(length) || length < 0) {
      if (getRequestHeader(event, 'transfer-encoding') || length !== undefined) {
        throw createError({ statusCode: 411, statusMessage: 'Content-Length is required' })
      }
    } else if (length > (multipart ? MAX_UPLOAD_BODY : MAX_JSON_BODY)) {
      throw createError({ statusCode: 413, statusMessage: 'Request body is too large' })
    }
  }

  if (isApi) await rateLimit(event, 'api', API_LIMIT, MINUTE)
})
