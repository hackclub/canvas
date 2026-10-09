import type { H3Event } from 'h3'
import { and, eq, getTableColumns, isNotNull } from 'drizzle-orm'

type DB = ReturnType<typeof useDB>
type Tx = Parameters<Parameters<DB['transaction']>[0]>[0]

const MAX_NAME_LENGTH = 100
const MAX_TEXT_LENGTH = 5000
const MAX_HACKATIME_PROJECTS = 100
const MAX_HACKATIME_NAME_LENGTH = 255

// Every project column except the owner's Hackatime ID, which is only for use outside
// Canvas. Use this for any select or returning() that goes back to the browser.
const { hackatimeId: _hackatimeId, ...projectColumns } = getTableColumns(schema.projects)
export { projectColumns }

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

// Loads the project in the `id` route param, 404ing unless it belongs to the user
export async function requireOwnProject(event: H3Event, userId: string) {
  const id = Number(getRouterParam(event, 'id'))
  const project = Number.isSafeInteger(id)
    ? await useDB().query.projects.findFirst({
        where: and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)),
        columns: { hackatimeId: false },
      })
    : undefined
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }
  return project
}

// 409s if the project has a ship in review, since it's locked until the review is done
export async function requireNotShipping(projectId: number) {
  const pending = await useDB().query.ships.findFirst({
    where: and(eq(schema.ships.projectId, projectId), eq(schema.ships.status, 'pending')),
    columns: { id: true },
  })
  if (pending) {
    throw createError({ statusCode: 409, statusMessage: "This project is being reviewed, so it can't be changed until the review is done" })
  }
}

// Whether any of the project's ships has been paid out. Its Hackatime time is accounted for
// by the project's own ships (see payShip), so a paid project can't be deleted or have
// Hackatime projects unlinked, or the same hours could be paid again by a new project.
export async function hasPaidShip(db: DB | Tx, projectId: number) {
  const [paid] = await db
    .select({ id: schema.ships.id })
    .from(schema.ships)
    .where(and(eq(schema.ships.projectId, projectId), isNotNull(schema.ships.pixelsAwarded)))
    .limit(1)
  return !!paid
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
  if (
    !Array.isArray(value)
    || value.length > MAX_HACKATIME_PROJECTS
    || !value.every((name) => typeof name === 'string' && name.length <= MAX_HACKATIME_NAME_LENGTH)
  ) {
    throw badRequest(`Hackatime projects must be a list of at most ${MAX_HACKATIME_PROJECTS} project names`)
  }
  return [...new Set(value as string[])]
}
