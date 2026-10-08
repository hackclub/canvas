import { eq } from 'drizzle-orm'

// GET /api/me/setup — whether the user has finished setup: linked Hackatime and made a project
// (even if they've since deleted it)
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const db = useDB()
  const [row, project] = await Promise.all([
    db.query.users.findFirst({
      where: eq(schema.users.id, user.id),
      columns: { hackatime: true, setupRewardedAt: true },
    }),
    db.query.projects.findFirst({ where: eq(schema.projects.userId, user.id), columns: { id: true } }),
  ])
  return {
    hackatimeLinked: !!row?.hackatime,
    projectCreated: !!project || !!row?.setupRewardedAt,
  }
})
