import { gzipSync } from 'node:zlib'
import { eq, sql } from 'drizzle-orm'
import sharp from 'sharp'

// A pixel to draw: its position on the board and its 0xRRGGBB color
export interface PixelPlacement {
  x: number
  y: number
  color: number
}

// The whole board kept in memory as RGB bytes (3 per pixel, row by row), so loading
// the canvas never touches the database. This assumes a single server process;
// running several would need something like Redis to share updates between them.
let board: Promise<Uint8Array> | undefined

function useBoard() {
  board ??= (async () => {
    const data = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 3).fill(0xff)
    const rows = await useDB()
      .select({ x: schema.canvasPixels.x, y: schema.canvasPixels.y, color: schema.canvasPixels.color })
      .from(schema.canvasPixels)
    for (const { x, y, color } of rows) {
      // Skip pixels left over from a bigger board
      if (x < CANVAS_WIDTH && y < CANVAS_HEIGHT) setColor(data, y * CANVAS_WIDTH + x, color)
    }
    return data
  })().catch((error) => {
    board = undefined
    throw error
  })
  return board
}

function getColor(data: Uint8Array, i: number) {
  return (data[i * 3]! << 16) | (data[i * 3 + 1]! << 8) | data[i * 3 + 2]!
}

function setColor(data: Uint8Array, i: number, color: number) {
  data[i * 3] = color >> 16
  data[i * 3 + 1] = (color >> 8) & 0xff
  data[i * 3 + 2] = color & 0xff
}

// Gzipped copy of the board for GET /api/canvas, rebuilt on the first request after a change
let snapshot: Buffer | undefined

// The board as RGB bytes, gzipped unless the client can't take it
export async function getCanvasSnapshot(gzip: boolean) {
  const data = await useBoard()
  if (!gzip) return Buffer.from(data)
  snapshot ??= gzipSync(data)
  return snapshot
}

// PNG of the board for the landing page. Not live: it's rendered at most once every
// PNG_MAX_AGE_SECONDS however many people ask or however often the canvas changes, and
// shared by everyone, so a busy landing page costs next to nothing.
export const PNG_MAX_AGE_SECONDS = 5 * 60
let png: { at: number, body: Promise<Buffer> } | undefined

export function getCanvasPng() {
  if (!png || Date.now() - png.at > PNG_MAX_AGE_SECONDS * 1000) {
    const body = useBoard().then((data) =>
      sharp(Buffer.from(data), { raw: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 3 } })
        .png()
        .toBuffer(),
    )
    const entry = { at: Date.now(), body }
    png = entry
    // Try again on the next request if it failed, rather than caching the failure
    body.catch(() => {
      if (png === entry) png = undefined
    })
  }
  return png.body
}

// Live updates for GET /api/canvas/stream. Changes are batched and sent every 100ms
// as a flat JSON array of [x, y, color, x, y, color, ...].
const listeners = new Set<(message: string) => void>()
let pending: number[] = []
let flushTimer: ReturnType<typeof setTimeout> | undefined

export function onCanvasUpdate(listener: (message: string) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function broadcast(placed: PixelPlacement[]) {
  for (const { x, y, color } of placed) pending.push(x, y, color)
  flushTimer ??= setTimeout(() => {
    flushTimer = undefined
    const message = JSON.stringify(pending)
    pending = []
    for (const listener of listeners) listener(message)
  }, 100)
}

// Placements run one at a time, so the in-memory board, the database and the order
// updates are broadcast in can't disagree about who drew over whom
let queue: Promise<unknown> = Promise.resolve()

function exclusive<T>(fn: () => Promise<T>) {
  const run = queue.then(fn)
  queue = run.catch(() => {})
  return run
}

// Draws as many of `requested` as the user can afford, in order, taking 1 pixel from
// their balance for each. Pixels that are already that color are skipped for free.
// Returns the pixels that couldn't be afforded and the user's new balance.
export function placePixels(userId: string, requested: PixelPlacement[]) {
  return exclusive(async () => {
    const data = await useBoard()

    // Only the last color for each spot counts
    const byIndex = new Map<number, PixelPlacement>()
    for (const p of requested) {
      const i = p.y * CANVAS_WIDTH + p.x
      byIndex.delete(i)
      byIndex.set(i, p)
    }
    const changes = [...byIndex].filter(([i, p]) => getColor(data, i) !== p.color)

    const { placed, balance } = await useDB().transaction(async (tx) => {
      const [user] = await tx
        .select({ pixels: schema.users.pixels, banned: schema.users.canvasBanned })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .for('update')
      // Checked under the row lock, so a ban applies to requests already in flight
      if (user?.banned) throw createError({ statusCode: 403, statusMessage: "You've been banned from drawing on the canvas" })
      const placed = changes.slice(0, Math.max(0, user?.pixels ?? 0))
      if (!placed.length) return { placed, balance: user?.pixels ?? 0 }

      const [updated] = await tx
        .update(schema.users)
        .set({ pixels: sql`${schema.users.pixels} - ${placed.length}` })
        .where(eq(schema.users.id, userId))
        .returning({ pixels: schema.users.pixels })
      await tx
        .insert(schema.canvasPixels)
        .values(placed.map(([, p]) => ({ x: p.x, y: p.y, color: p.color, userId })))
        .onConflictDoUpdate({
          target: [schema.canvasPixels.x, schema.canvasPixels.y],
          set: {
            color: sql`excluded.color`,
            userId: sql`excluded.user_id`,
            placedAt: sql`excluded.placed_at`,
          },
        })
      await tx
        .insert(schema.canvasPixelLog)
        .values(placed.map(([, p]) => ({ x: p.x, y: p.y, color: p.color, userId })))
      await tx.insert(schema.pixelTransactions).values({
        userId,
        amount: -placed.length,
        balance: updated!.pixels,
        reason: 'canvas',
      })
      return { placed, balance: updated!.pixels }
    })

    if (placed.length) {
      for (const [i, p] of placed) setColor(data, i, p.color)
      snapshot = undefined
      broadcast(placed.map(([, p]) => p))
      // Their first drawing can be what earns whoever referred them their pixels
      await payReferral(userId)
    }
    return {
      rejected: changes.slice(placed.length).map(([, p]) => p),
      balance,
    }
  })
}
