import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'

const MAX_NAME_LENGTH = 100
const MAX_TEXT_LENGTH = 5000

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

// Loads the project in the `id` route param, 404ing unless it belongs to the user
export async function requireOwnProject(event: H3Event, userId: string) {
  const id = Number(getRouterParam(event, 'id'))
  const project = Number.isSafeInteger(id)
    ? await useDB().query.projects.findFirst({
        where: and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)),
      })
    : undefined
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }
  return project
}

export function parseProjectName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw badRequest(`Project name must be 1 to ${MAX_NAME_LENGTH} characters`)
  }
  return name
}

export function parseProjectText(value: unknown, field: string) {
  if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH) {
    throw badRequest(`${field} must be text of at most ${MAX_TEXT_LENGTH} characters`)
  }
  return value.trim()
}

// Empty means "no URL"; otherwise it has to be an http(s) link
export function parseProjectUrl(value: unknown, field: string) {
  if (value === null || value === '') {
    return null
  }
  if (typeof value === 'string') {
    try {
      const url = new URL(value.trim())
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.href
      }
    } catch {
      // fall through to the error below
    }
  }
  throw badRequest(`${field} must be a valid http(s) URL`)
}

export function parseHackatimeProjectNames(value: unknown) {
  if (!Array.isArray(value) || !value.every((name) => typeof name === 'string')) {
    throw badRequest('Hackatime projects must be a list of project names')
  }
  return [...new Set(value as string[])]
}
