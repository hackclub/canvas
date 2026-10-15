import { and, eq, isNotNull, max, ne } from 'drizzle-orm'

// Syncs approved ships to the YSWS Airtable table, one record per ship.
// Needs the Airtable token/base/table (see AIRTABLE_* in .env.example). The address, email and
// birthday are read from Hack Club Auth with the token saved at the user's last sign-in.
const AIRTABLE_URL = 'https://api.airtable.com/v0'
const HACKATIME_URL = 'https://hackatime.hackclub.com'

interface HackatimeProjectDetails {
  name: string
  // ISO 8601, null if there are no heartbeats
  first_heartbeat: string | null
  last_heartbeat: string | null
}

async function fetchGithubUsername(token: string) {
  const me = await $fetch<{ github_username: string | null }>(
    `${HACKATIME_URL}/api/v1/authenticated/me`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return me.github_username
}

async function fetchHackatimeProjectDetails(token: string, names: string[]) {
  if (!names.length) return []
  const { projects } = await $fetch<{ projects: HackatimeProjectDetails[] }>(
    `${HACKATIME_URL}/api/v1/users/my/projects/details`,
    {
      headers: { Authorization: `Bearer ${token}` },
      // Same window as the hours, so the date ranges match them
      query: { projects: names.join(','), since: HACKATIME_START, start_date: HACKATIME_START },
    },
  )
  return projects
}

// e.g. 7/20/2026, in UTC
function formatDate(iso: string) {
  const date = new Date(iso)
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`
}

// "hackatime-project 7/20/2026-7/22/2026, hackatime-project-2 7/21/2026-7/23/2026"
function formatProjectRanges(projects: HackatimeProjectDetails[]) {
  return projects
    .filter((p) => p.first_heartbeat && p.last_heartbeat)
    .map((p) => `${p.name} ${formatDate(p.first_heartbeat!)}-${formatDate(p.last_heartbeat!)}`)
    .join(', ')
}

function hours(seconds: number) {
  return Math.round(seconds / 36) / 100
}

// The submitter's personal details as they're sent to Airtable: their Hack Club Auth identity
// and primary address, and their GitHub username from Hackatime
export async function fetchSubmitterDetails(user: Pick<typeof schema.users.$inferSelect, 'id' | 'hca' | 'hackatime'>) {
  // Users from before the token was saved need to sign in again
  if (!user.hca) throw new Error(`User ${user.id} has no Hack Club Auth token, they need to sign in again`)
  const [identity, githubUsername] = await Promise.all([
    fetchHcaIdentity(decryptToken(user.hca.access_token)),
    user.hackatime ? fetchGithubUsername(decryptToken(user.hackatime.access_token)) : null,
  ])
  const address = identity.addresses?.find((a) => a.primary) ?? identity.addresses?.[0]
  return { identity, address, githubUsername }
}

// Creates the Airtable record for an approved ship. `siteUrl` is the public origin the
// banner is served from, since Airtable downloads attachments from a URL.
export async function syncShipToAirtable(shipId: number, siteUrl: string) {
  const { airtable } = useRuntimeConfig()
  if (!airtable.token || !airtable.baseId || !airtable.table) {
    console.warn(`Airtable sync is not configured, skipping ship ${shipId}`)
    return
  }

  const [row] = await useDB()
    .select({ ship: schema.ships, project: schema.projects, user: schema.users })
    .from(schema.ships)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
    .innerJoin(schema.users, eq(schema.users.id, schema.projects.userId))
    .where(eq(schema.ships.id, shipId))
  if (!row) throw new Error(`Ship ${shipId} not found`)
  const { ship, project, user } = row

  // Time the project's earlier ships were already submitted with (same as payShip)
  const [previous] = await useDB()
    .select({ seconds: max(schema.ships.hackatimeSeconds) })
    .from(schema.ships)
    .where(and(
      eq(schema.ships.projectId, project.id),
      ne(schema.ships.id, ship.id),
      isNotNull(schema.ships.pixelsAwarded),
    ))
  const previousSeconds = previous?.seconds ?? 0
  const shipSeconds = ship.hackatimeSeconds ?? 0

  const hackatimeToken = user.hackatime ? decryptToken(user.hackatime.access_token) : undefined
  const [{ identity, address, githubUsername }, hackatimeProjects] = await Promise.all([
    fetchSubmitterDetails(user),
    hackatimeToken ? fetchHackatimeProjectDetails(hackatimeToken, project.hackatimeProjects) : [],
  ])

  const fields: Record<string, unknown> = {
    'Code URL': project.repoUrl,
    'Playable URL': project.demoUrl,
    'First Name': identity.first_name ?? user.identity.first_name,
    'Last Name': identity.last_name ?? user.identity.last_name,
    'Email': identity.primary_email,
    'Screenshot': project.bannerKey ? [{ url: new URL(`/images/${project.bannerKey}`, siteUrl).href }] : undefined,
    'Description': project.description,
    'GitHub Username': githubUsername,
    'Address (Line 1)': address?.line_1,
    'Address (Line 2)': address?.line_2,
    'City': address?.city,
    'State / Province': address?.state,
    'Country': address?.country,
    'ZIP / Postal Code': address?.postal_code,
    'Birthday': identity.birthday,
    'Justification - Hackatime Project Name(s) + Date Range(s)': formatProjectRanges(hackatimeProjects),
    'Justification - Submitter Hackatime ID': user.hackatimeId?.toString(),
    'Canvas - Project ID': project.id.toString(),
    'Canvas - User ID': user.id,
  }
  const justification = ship.justification
  if (justification) {
    fields['Justification - Specific Technical Features'] = justification.specialTechnicalFeatures
    fields['Justification - Deflation Justification'] = justification.deflationJustification
    fields['Justification - Additional Justification'] = justification.additionalJustification
  }
  // 'Optional - Override Hours Spent Justification' is left alone: it overrides a field
  // Airtable generates itself
  if (justification?.overrideHours != null) {
    // The reviewer's hours win over the automatic reship calculation
    fields['Optional - Override Hours Spent'] = justification.overrideHours
  } else if (previousSeconds > 0) {
    // A reship only counts the time since the project's last approved ship
    fields['Optional - Override Hours Spent'] = hours(Math.max(0, shipSeconds - previousSeconds))
  }

  await $fetch(`${AIRTABLE_URL}/${airtable.baseId}/${encodeURIComponent(airtable.table)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${airtable.token}` },
    // typecast lets Airtable convert values for select/date fields
    body: {
      records: [{ fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null && v !== '')) }],
      typecast: true,
    },
  })
}
