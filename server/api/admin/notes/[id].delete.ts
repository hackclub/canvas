import { eq } from 'drizzle-orm'

// DELETE /api/admin/notes/:id — remove an internal note
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id)) throw createError({ statusCode: 404, statusMessage: 'Note not found' })
  const [deleted] = await useDB()
    .delete(schema.adminNotes)
    .where(eq(schema.adminNotes.id, id))
    .returning({ id: schema.adminNotes.id })
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Note not found' })
  return deleted
})
