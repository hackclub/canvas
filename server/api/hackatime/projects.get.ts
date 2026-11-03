import { eq } from 'drizzle-orm'

// GET /api/hackatime/projects — the signed-in user's Hackatime projects, each with the
// Canvas project it's linked to (if any). `linked` is false if Hackatime isn't linked.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  // Each call goes to Hackatime
  await rateLimit(event, 'hackatime', 30, MINUTE)
  const hackatimeProjects = await getHackatimeProjects(user.id)
  if (!hackatimeProjects) {
    return { linked: false, projects: [] }
  }

  const projects = await useDB().query.projects.findMany({
    where: eq(schema.projects.userId, user.id),
    columns: { id: true, name: true, hackatimeProjects: true },
  })
  const linkedTo = new Map<string, { id: number, name: string }>()
  for (const { id, name, hackatimeProjects } of projects) {
    for (const hackatimeProject of hackatimeProjects) {
      linkedTo.set(hackatimeProject, { id, name })
    }
  }

  return {
    linked: true,
    projects: hackatimeProjects.map((p) => ({
      name: p.name,
      totalSeconds: p.total_seconds,
      linkedTo: linkedTo.get(p.name) ?? null,
    })),
  }
})
