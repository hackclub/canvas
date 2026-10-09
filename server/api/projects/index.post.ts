import { sql } from 'drizzle-orm'

// Pixels for creating a first project, once per user (see users.setupRewardedAt)
const SETUP_REWARD_PIXELS = 3

// POST /api/projects { name } — creates a project; everything else is filled in on its page.
// `rewarded` is true when this was their first one and they got pixels for it.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ name?: unknown }>(event)
  const name = parseProjectName(body?.name)

  const result = await useDB().transaction(async (tx) => {
    const [project] = await tx
      .insert(schema.projects)
      .values({ userId: user.id, name })
      .returning({ id: schema.projects.id })

    // Only the request that sets setupRewardedAt gets the pixel, so parallel requests can't
    // both earn it
    const [claimed] = await tx
      .update(schema.users)
      .set({ setupRewardedAt: new Date(), pixels: sql`${schema.users.pixels} + ${SETUP_REWARD_PIXELS}` })
      .where(sql`${schema.users.id} = ${user.id} and ${schema.users.setupRewardedAt} is null`)
      .returning({ pixels: schema.users.pixels })
    if (claimed) {
      await tx.insert(schema.pixelTransactions).values({
        userId: user.id,
        amount: SETUP_REWARD_PIXELS,
        balance: claimed.pixels,
        reason: 'setup',
      })
    }
    return { id: project!.id, rewarded: !!claimed }
  })
  setResponseStatus(event, 201)
  return result
})
