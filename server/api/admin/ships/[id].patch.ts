import { and, eq, sql, type SQL } from 'drizzle-orm'
import type { ShipStatus } from '../../../database/schema'
import type { ShipJustification } from '../../../../shared/types/ships'

interface Body {
  status?: ShipStatus
  feedback?: string
  // Changes the status of an already reviewed ship, e.g. to undo a mistaken review
  override?: boolean
  // Pays this ship's pixels 1.2x, applied when it's first approved
  cooking?: boolean
  // For the Airtable spot-checkers, saved with the review
  justification?: Partial<Record<keyof ShipJustification, unknown>>
}

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

// Undefined if the request doesn't include one, so changing a ship's status doesn't wipe it
function parseJustification(value: Body['justification']): ShipJustification | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object') throw badRequest('Invalid justification')

  let overrideHours: number | null = null
  if (value.overrideHours !== null && value.overrideHours !== undefined && value.overrideHours !== '') {
    overrideHours = Number(value.overrideHours)
    if (!Number.isFinite(overrideHours) || overrideHours < 0 || overrideHours > 1000) {
      throw badRequest('Override hours must be a number between 0 and 1000')
    }
    overrideHours = Math.round(overrideHours * 100) / 100
  }
  const justification: ShipJustification = {
    overrideHours,
    overrideHoursJustification: parseProjectText(value.overrideHoursJustification ?? '', 'Override hours justification'),
    specialTechnicalFeatures: parseProjectText(value.specialTechnicalFeatures ?? '', 'Special technical features'),
    deflationJustification: parseProjectText(value.deflationJustification ?? '', 'Deflation justification'),
    additionalJustification: parseProjectText(value.additionalJustification ?? '', 'Additional justification'),
  }
  if (overrideHours !== null && !justification.overrideHoursJustification) {
    throw badRequest('Say why the hours were overridden')
  }
  return justification
}

// PATCH /api/admin/ships/:id — approves or rejects a pending ship, which unlocks the project.
// With `override`, sets the project's latest ship to any status instead; setting it back to
// pending puts it back in the review queue and locks the project again.
// The first time a ship is approved, its owner gets paid for its hours (see payShip) and it's
// synced to Airtable (see syncShipToAirtable).
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

  const justification = parseJustification(body.justification)

  const reviewed = body.status !== 'pending'

  // Ships from before Hackatime time was saved when shipping get paid for the time now.
  // Looked up before the transaction, so it isn't held open waiting on Hackatime.
  let fallbackSeconds: number | null = null
  if (body.status === 'approved' && Number.isSafeInteger(id)) {
    const [ship] = await useDB()
      .select({
        hackatimeSeconds: schema.ships.hackatimeSeconds,
        pixelsAwarded: schema.ships.pixelsAwarded,
        ownerId: schema.projects.userId,
        hackatimeProjects: schema.projects.hackatimeProjects,
      })
      .from(schema.ships)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
      .where(eq(schema.ships.id, id))
    if (ship && ship.hackatimeSeconds === null && ship.pixelsAwarded === null) {
      fallbackSeconds = await getProjectHackatimeSeconds(ship.ownerId, ship.hackatimeProjects) ?? 0
    }
  }

  let paid = false
  const updated = Number.isSafeInteger(id)
    ? await useDB().transaction(async (tx) => {
        // Locked so the audit log gets the status it was changed from
        const [before] = await tx
          .select({ status: schema.ships.status, ownerId: schema.projects.userId })
          .from(schema.ships)
          .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
          .where(eq(schema.ships.id, id))
          .for('update', { of: schema.ships })
        const [updated] = await tx
          .update(schema.ships)
          .set({
            status: body.status!,
            feedback,
            ...(typeof body.cooking === 'boolean' ? { cooking: body.cooking } : {}),
            ...(justification ? { justification } : {}),
            reviewerId: reviewed ? me.id : null,
            reviewedAt: reviewed ? new Date() : null,
          })
          .where(and(...where))
          .returning()
        if (updated && before && updated.status === 'approved' && updated.pixelsAwarded === null) {
          const payout = await payShip(tx, updated, before.ownerId, updated.hackatimeSeconds ?? fallbackSeconds ?? 0)
          Object.assign(updated, { pixelsAwarded: payout.pixels, bonusPointsAwarded: payout.bonusPoints })
          paid = true
        }
        if (updated && before) {
          await logAdminAction(
            tx,
            me.id,
            override
              ? { action: 'ship.override', details: { shipId: id, from: before.status, to: updated.status, feedback } }
              : { action: 'ship.review', details: { shipId: id, status: updated.status, feedback } },
            { userId: before.ownerId, projectId: updated.projectId },
          )
        }
        return updated
      })
    : undefined

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

  // Once the approval is committed. In the background, so a slow or failing Airtable doesn't
  // hold up or fail the review.
  if (paid) {
    // From config rather than request headers, which the sender can set (X-Forwarded-Host)
    const siteUrl = useRuntimeConfig(event).siteUrl || getRequestURL(event).origin
    syncShipToAirtable(id, siteUrl).catch((error) => {
      console.error(`Failed to sync ship ${id} to Airtable:`, error)
    })
  }
  return updated
})
