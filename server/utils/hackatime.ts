import { eq } from 'drizzle-orm'

// Hackatime API (https://hackatime.hackclub.com/api-docs), called with the user's OAuth token
const HACKATIME_URL = 'https://hackatime.hackclub.com'

// Only time logged from this moment counts for anything in Canvas. Hackatime has two
// parameters for it: `start_date` limits the time that's counted in `total_seconds`, and
// `since` limits which projects are listed (it leaves the totals as they are, so on its
// own it isn't enough). Both are sent.
export const HACKATIME_START = '2026-10-08T00:00:00Z'
const startQuery = { since: HACKATIME_START, start_date: HACKATIME_START }

export interface HackatimeProject {
  name: string
  total_seconds: number
  // ISO 8601, null if there are no heartbeats
  most_recent_heartbeat: string | null
  languages: string[]
  archived: boolean
}

// Lists the user's Hackatime projects with their time since HACKATIME_START, or returns null if
// they haven't linked Hackatime. With `all`, lists every project they've ever had with all of
// its time, for checking that a name belongs to them.
export async function getHackatimeProjects(userId: string, { all = false } = {}): Promise<HackatimeProject[] | null> {
  const row = await useDB().query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { hackatime: true },
  })
  if (!row?.hackatime) {
    return null
  }

  try {
    const { projects } = await $fetch<{ projects: HackatimeProject[] }>(
      `${HACKATIME_URL}/api/v1/authenticated/projects`,
      {
        headers: { Authorization: `Bearer ${decryptToken(row.hackatime.access_token)}` },
        // Archived projects still count, so hours don't drop if the user archives one
        query: { include_archived: true, ...(all ? {} : startQuery) },
      },
    )
    return projects
  } catch (error) {
    console.error('Hackatime projects request failed:', error)
    throw createError({ statusCode: 502, statusMessage: 'Could not reach Hackatime' })
  }
}

// Total time across a Canvas project's linked Hackatime projects, or null if the user
// hasn't linked Hackatime
export async function getProjectHackatimeSeconds(userId: string, hackatimeProjects: string[]) {
  const projects = await getHackatimeProjects(userId)
  if (!projects) return null
  const linked = new Set(hackatimeProjects)
  return projects
    .filter((p) => linked.has(p.name))
    .reduce((total, p) => total + p.total_seconds, 0)
}
