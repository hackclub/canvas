import { and, eq } from 'drizzle-orm'

interface Body {
  status?: 'approved' | 'rejected'
  feedback?: string
}

// PATCH /api/admin/ships/:id — approves or rejects a pending ship, which unlocks the project
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<Body>(event)

  if (body?.status !== 'approved' && body?.status !== 'rejected') {
    throw createError({ statusCode: 400, statusMessage: 'Status must be "approved" or "rejected"' })
  }
  const feedback = parseProjectText(body.feedback ?? '', 'Feedback')
  if (body.status === 'rejected' && !feedback) {
    throw createError({ statusCode: 400, statusMessage: 'Say why the ship was rejected, so they know what to fix' })
  }

  // Only pending ships can be reviewed, so two admins can't review the same ship
  const [updated] = Number.isSafeInteger(id)
    ? await useDB()
        .update(schema.ships)
        .set({ status: body.status, feedback, reviewerId: me.id, reviewedAt: new Date() })
        .where(and(eq(schema.ships.id, id), eq(schema.ships.status, 'pending')))
        .returning()
    : []

  if (!updated) {
    const exists = Number.isSafeInteger(id) && await useDB().query.ships.findFirst({
      where: eq(schema.ships.id, id),
      columns: { id: true },
    })
    if (!exists) throw createError({ statusCode: 404, statusMessage: 'Ship not found' })
    throw createError({ statusCode: 409, statusMessage: 'This ship has already been reviewed' })
  }
  return updated
})
