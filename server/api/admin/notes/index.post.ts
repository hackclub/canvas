const MAX_LENGTH = 5000

// POST /api/admin/notes — leave an internal note on a user, project or shop order:
// { userId | projectId | orderId, body }
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const body = await readBody<{ userId?: string, projectId?: number, orderId?: number, body?: string }>(event)
  const target = noteTarget(event, body ?? {})
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!text) throw createError({ statusCode: 400, statusMessage: "Notes can't be empty" })
  if (text.length > MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Notes can be at most ${MAX_LENGTH} characters` })
  }

  try {
    const [note] = await useDB()
      .insert(schema.adminNotes)
      .values({ ...target, authorId: me.id, body: text })
      .returning({ id: schema.adminNotes.id })
    return note
  } catch (e) {
    // The user, project or order doesn't exist (foreign key violation)
    if ((e as { cause?: { code?: string } }).cause?.code === '23503' || (e as { code?: string }).code === '23503') {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    throw e
  }
})
