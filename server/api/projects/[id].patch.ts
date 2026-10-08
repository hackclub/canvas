import { and, arrayOverlaps, eq, ne } from 'drizzle-orm'

type ProjectUpdate = Partial<typeof schema.projects.$inferInsert>

// PATCH /api/projects/:id — updates whichever fields are in the body
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const project = await requireOwnProject(event, user.id)
  await requireNotShipping(project.id)
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}

  const update: ProjectUpdate = {}
  if ('name' in body) update.name = parseProjectName(body.name)
  if ('description' in body) update.description = parseProjectText(body.description, 'Description')
  if ('aiUsage' in body) update.aiUsage = parseProjectText(body.aiUsage, 'AI usage declaration')
  if ('demoUrl' in body) update.demoUrl = parseProjectUrl(body.demoUrl, 'Demo URL')
  if ('repoUrl' in body) update.repoUrl = parseProjectUrl(body.repoUrl, 'GitHub URL')
  if ('preexisting' in body) {
    if (typeof body.preexisting !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: 'preexisting must be a boolean' })
    }
    update.preexisting = body.preexisting
  }

  if ('hackatimeProjects' in body) {
    const names = parseHackatimeProjectNames(body.hackatimeProjects)
    if (names.length) {
      // Only allow the user's own Hackatime projects
      const hackatimeProjects = await getHackatimeProjects(user.id, { all: true })
      if (!hackatimeProjects) {
        throw createError({ statusCode: 400, statusMessage: 'Link Hackatime before adding Hackatime projects' })
      }
      const known = new Set(hackatimeProjects.map((p) => p.name))
      const unknown = names.find((name) => !known.has(name))
      if (unknown) {
        throw createError({ statusCode: 400, statusMessage: `"${unknown}" isn't one of your Hackatime projects` })
      }
    }
    update.hackatimeProjects = names
  }

  return useDB().transaction(async (tx) => {
    if (update.hackatimeProjects) {
      const names = update.hackatimeProjects
      // Locks the user, so two requests at once can't both pass the checks below and link
      // the same Hackatime project to two projects
      await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .for('update')

      // Hackatime projects can't be counted towards more than one project... (nothing to
      // check when unlinking them all, and arrayOverlaps throws for an empty list)
      const conflict = names.length
        ? await tx.query.projects.findFirst({
            where: and(
              eq(schema.projects.userId, user.id),
              ne(schema.projects.id, project.id),
              arrayOverlaps(schema.projects.hackatimeProjects, names),
            ),
            columns: { name: true, hackatimeProjects: true },
          })
        : undefined
      if (conflict) {
        const taken = names.find((name) => conflict.hackatimeProjects.includes(name))
        throw createError({ statusCode: 409, statusMessage: `"${taken}" is already linked to ${conflict.name}` })
      }

      // ...and once a project has been paid for their time, they stay linked to it. Otherwise
      // they could be moved to a new project and paid for again.
      const current = await tx.query.projects.findFirst({
        where: eq(schema.projects.id, project.id),
        columns: { hackatimeProjects: true },
      })
      const removing = (current?.hackatimeProjects ?? []).some((name) => !names.includes(name))
      if (removing && await hasPaidShip(tx, project.id)) {
        throw createError({
          statusCode: 409,
          statusMessage: "This project has been paid out for its Hackatime time, so those projects can't be unlinked",
        })
      }
    }

    const [updated] = await tx
      .update(schema.projects)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(schema.projects.id, project.id))
      .returning()
    return updated
  })
})
