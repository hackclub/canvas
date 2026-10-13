import { eq } from 'drizzle-orm'

// POST /api/admin/ships/:id/airtable — syncs an approved ship to Airtable again, for ships whose
// sync failed when they were approved. Doesn't check for an existing record, so only run it for
// ships that aren't in Airtable yet.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const ship = Number.isSafeInteger(id) && await useDB().query.ships.findFirst({
    where: eq(schema.ships.id, id),
    columns: { status: true, pixelsAwarded: true },
  })
  if (!ship) throw createError({ statusCode: 404, statusMessage: 'Ship not found' })
  if (ship.status !== 'approved' || ship.pixelsAwarded === null) {
    throw createError({ statusCode: 409, statusMessage: 'Only approved ships can be synced to Airtable' })
  }

  const siteUrl = useRuntimeConfig(event).siteUrl || getRequestURL(event).origin
  try {
    await syncShipToAirtable(id, siteUrl)
  } catch (error) {
    console.error(`Failed to sync ship ${id} to Airtable:`, error)
    // Airtable's response body says which field it rejected
    const { data, message } = error as { data?: unknown, message?: string }
    const reason = data ? JSON.stringify(data) : message
    throw createError({ statusCode: 502, statusMessage: `Airtable sync failed: ${reason}` })
  }
  return { ok: true }
})
