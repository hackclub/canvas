// GET /api/canvas/stream — server-sent events with pixels as they're drawn,
// each message a flat JSON array of [x, y, color, x, y, color, ...]
export default defineEventHandler(async (event) => {
  const stream = createEventStream(event)
  const unsubscribe = onCanvasUpdate((message) => stream.push(message))
  // Keeps proxies from closing the connection while nobody's drawing
  const ping = setInterval(() => stream.push({ event: 'ping', data: '' }), 25_000)

  stream.onClosed(async () => {
    unsubscribe()
    clearInterval(ping)
    await stream.close()
  })
  // Headers aren't sent until the first message, and the client waits for them
  // (EventSource's "open") before downloading the board
  stream.push({ event: 'ready', data: '' })
  return stream.send()
})
