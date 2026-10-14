import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'

// What a note is on, from ?userId= / ?projectId= / ?orderId= (or the same in a body).
// Exactly one of them.
export function noteTarget(event: H3Event, from: { userId?: unknown, projectId?: unknown, orderId?: unknown }) {
  const userId = typeof from.userId === 'string' && from.userId ? from.userId : null
  const projectId = from.projectId != null && from.projectId !== '' ? Number(from.projectId) : null
  const orderId = from.orderId != null && from.orderId !== '' ? Number(from.orderId) : null
  if ([userId, projectId, orderId].filter((id) => id !== null).length !== 1) {
    throw createError({ statusCode: 400, statusMessage: 'Give one of a userId, projectId or orderId' })
  }
  if (projectId !== null && !Number.isSafeInteger(projectId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid projectId' })
  }
  if (orderId !== null && !Number.isSafeInteger(orderId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid orderId' })
  }
  return { userId, projectId, orderId }
}

// Matches the notes on a target from noteTarget
export function noteTargetWhere({ userId, projectId, orderId }: ReturnType<typeof noteTarget>) {
  if (userId !== null) return eq(schema.adminNotes.userId, userId)
  if (projectId !== null) return eq(schema.adminNotes.projectId, projectId)
  return eq(schema.adminNotes.orderId, orderId!)
}
