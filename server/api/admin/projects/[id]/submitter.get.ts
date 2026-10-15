import { eq } from 'drizzle-orm'

// GET /api/admin/projects/:id/submitter — the project owner's personal details, the same ones
// sent to Airtable when a ship is approved (see fetchSubmitterDetails). Only loaded when a
// reviewer opens them, since they're read from Hack Club Auth and Hackatime.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const [row] = Number.isSafeInteger(id)
    ? await useDB()
        .select({ user: schema.users })
        .from(schema.projects)
        .innerJoin(schema.users, eq(schema.users.id, schema.projects.userId))
        .where(eq(schema.projects.id, id))
    : []
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  const { user } = row

  const signInAgain = createError({
    statusCode: 409,
    statusMessage: 'Their saved sign-in has expired, they need to sign in to Canvas again',
  })
  if (!user.hca) throw signInAgain

  let details: Awaited<ReturnType<typeof fetchSubmitterDetails>>
  try {
    details = await fetchSubmitterDetails(user)
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status === 401 || status === 403) throw signInAgain
    console.error(`Failed to load submitter details for project ${id}:`, error)
    throw createError({ statusCode: 502, statusMessage: "Couldn't reach Hack Club Auth or Hackatime, try again in a bit" })
  }
  const { identity, address, githubUsername } = details

  return {
    // Same fallbacks as the Airtable sync
    firstName: identity.first_name ?? user.identity.first_name ?? null,
    lastName: identity.last_name ?? user.identity.last_name ?? null,
    birthday: identity.birthday ?? null,
    githubUsername,
    address: address ? toShippingAddress(address) : null,
  }
})
