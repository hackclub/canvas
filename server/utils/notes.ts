import type { H3Event } from 'h3'

// What a note is on, from ?userId= / ?projectId= (or the same in a body). Exactly one of them.
export function noteTarget(event: H3Event, from: { userId?: unknown, projectId?: unknown }) {
  const userId = typeof from.userId === 'string' && from.userId ? from.userId : null
  const projectId = from.projectId != null && from.projectId !== '' ? Number(from.projectId) : null
  if ((userId === null) === (projectId === null)) {
    throw createError({ statusCode: 400, statusMessage: 'Give either a userId or a projectId' })
  }
  if (projectId !== null && !Number.isSafeInteger(projectId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid projectId' })
  }
  return { userId, projectId }
}
