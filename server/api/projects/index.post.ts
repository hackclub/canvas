// POST /api/projects { name } — creates a project; everything else is filled in on its page
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ name?: unknown }>(event)
  const name = parseProjectName(body?.name)

  const [project] = await useDB()
    .insert(schema.projects)
    .values({ userId: user.id, name })
    .returning({ id: schema.projects.id })
  setResponseStatus(event, 201)
  return project!
})
