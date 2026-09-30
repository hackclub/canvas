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
      // Only allow the user's own Hackatime projects...
      const hackatimeProjects = await getHackatimeProjects(user.id)
      if (!hackatimeProjects) {
        throw createError({ statusCode: 400, statusMessage: 'Link Hackatime before adding Hackatime projects' })
      }
      const known = new Set(hackatimeProjects.map((p) => p.name))
      const unknown = names.find((name) => !known.has(name))
      if (unknown) {
        throw createError({ statusCode: 400, statusMessage: `"${unknown}" isn't one of your Hackatime projects` })
      }

      // ...that aren't already counted towards another project
      const conflict = await useDB().query.projects.findFirst({
        where: and(
          eq(schema.projects.userId, user.id),
          ne(schema.projects.id, project.id),
          arrayOverlaps(schema.projects.hackatimeProjects, names),
        ),
        columns: { name: true, hackatimeProjects: true },
      })
      if (conflict) {
        const taken = names.find((name) => conflict.hackatimeProjects.includes(name))
        throw createError({ statusCode: 409, statusMessage: `"${taken}" is already linked to ${conflict.name}` })
      }
    }
    update.hackatimeProjects = names
  }

  const [updated] = await useDB()
    .update(schema.projects)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(schema.projects.id, project.id))
    .returning()
  return updated
})
