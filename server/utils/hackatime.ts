import { eq } from 'drizzle-orm'

// Hackatime API (https://hackatime.hackclub.com/api-docs), called with the user's OAuth token
const HACKATIME_URL = 'https://hackatime.hackclub.com'

export interface HackatimeProject {
  name: string
  total_seconds: number
  // ISO 8601, null if there are no heartbeats
  most_recent_heartbeat: string | null
  languages: string[]
  archived: boolean
}

// Lists the user's Hackatime projects, or returns null if they haven't linked Hackatime
export async function getHackatimeProjects(userId: string): Promise<HackatimeProject[] | null> {
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
        headers: { Authorization: `Bearer ${row.hackatime.access_token}` },
        // Archived projects still count, so hours don't drop if the user archives one
        query: { include_archived: true },
      },
    )
    return projects
  } catch (error) {
    console.error('Hackatime projects request failed:', error)
    throw createError({ statusCode: 502, statusMessage: 'Could not reach Hackatime' })
  }
}
