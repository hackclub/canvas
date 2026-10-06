// A few tabs is normal; this stops one account from holding open thousands of connections
const MAX_STREAMS_PER_USER = 5
const openStreams = new Map<string, number>()

// GET /api/canvas/stream — server-sent events with pixels as they're drawn,
// each message a flat JSON array of [x, y, color, x, y, color, ...]
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const open = openStreams.get(user.id) ?? 0
  if (open >= MAX_STREAMS_PER_USER) {
    throw createError({ statusCode: 429, statusMessage: 'Too many open connections' })
  }
  openStreams.set(user.id, open + 1)

  const stream = createEventStream(event)
  const unsubscribe = onCanvasUpdate((message) => stream.push(message))
  // Keeps proxies from closing the connection while nobody's drawing
  const ping = setInterval(() => stream.push({ event: 'ping', data: '' }), 25_000)

  stream.onClosed(async () => {
    unsubscribe()
    clearInterval(ping)
    const left = (openStreams.get(user.id) ?? 1) - 1
    if (left > 0) openStreams.set(user.id, left)
    else openStreams.delete(user.id)
    await stream.close()
  })
  // Headers aren't sent until the first message, and the client waits for them
  // (EventSource's "open") before downloading the board
  stream.push({ event: 'ready', data: '' })
  return stream.send()
})
