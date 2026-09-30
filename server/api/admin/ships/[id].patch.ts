import { and, eq, sql, type SQL } from 'drizzle-orm'
import type { ShipStatus } from '../../../database/schema'

interface Body {
  status?: ShipStatus
  feedback?: string
  // Changes the status of an already reviewed ship, e.g. to undo a mistaken review
  override?: boolean
}

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

// PATCH /api/admin/ships/:id — approves or rejects a pending ship, which unlocks the project.
// With `override`, sets the project's latest ship to any status instead; setting it back to
// pending puts it back in the review queue and locks the project again.
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<Body>(event)
  const override = body?.override === true

  const allowed: ShipStatus[] = override ? ['pending', 'approved', 'rejected'] : ['approved', 'rejected']
  if (!body?.status || !allowed.includes(body.status)) {
    throw badRequest(`Status must be ${allowed.map((s) => `"${s}"`).join(' or ')}`)
  }
  const feedback = parseProjectText(body.feedback ?? '', 'Feedback')
  if (body.status === 'rejected' && !feedback) {
    throw badRequest('Say why the ship was rejected, so they know what to fix')
  }

  const where: SQL[] = [eq(schema.ships.id, id)]
  if (override) {
    // Only the latest ship, so reopening one can't put two of a project's ships in review
    // (outer columns are written out, since Drizzle leaves them unqualified in updates and
    // they'd resolve to the subquery's own table)
    where.push(sql`"ships"."id" = (
      select max(latest.id) from "ships" as latest
      where latest.project_id = "ships"."project_id"
    )`)
  } else {
    // Only pending ships can be reviewed, so two admins can't review the same ship
    where.push(eq(schema.ships.status, 'pending'))
  }

  const reviewed = body.status !== 'pending'
  const [updated] = Number.isSafeInteger(id)
    ? await useDB()
        .update(schema.ships)
        .set({
          status: body.status,
          feedback,
          reviewerId: reviewed ? me.id : null,
          reviewedAt: reviewed ? new Date() : null,
        })
        .where(and(...where))
        .returning()
    : []

  if (!updated) {
    const exists = Number.isSafeInteger(id) && await useDB().query.ships.findFirst({
      where: eq(schema.ships.id, id),
      columns: { id: true },
    })
    if (!exists) throw createError({ statusCode: 404, statusMessage: 'Ship not found' })
    throw createError({
      statusCode: 409,
      statusMessage: override
        ? "Only a project's latest ship can be changed"
        : 'This ship has already been reviewed',
    })
  }
  return updated
})
