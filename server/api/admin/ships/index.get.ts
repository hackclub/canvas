import { asc, desc, eq } from 'drizzle-orm'
import type { ShipStatus } from '../../../database/schema'

const STATUSES = new Set<ShipStatus>(['pending', 'approved', 'rejected'])

// GET /api/admin/ships?status=pending — ships with their project and owner.
// Pending ships come oldest first so the queue is first come, first served;
// reviewed ships come most recently reviewed first.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { status = 'pending' } = getQuery(event)
  if (!STATUSES.has(status as ShipStatus)) {
    throw createError({ statusCode: 400, statusMessage: 'Status must be pending, approved or rejected' })
  }

  return useDB()
    .select({
      id: schema.ships.id,
      status: schema.ships.status,
      feedback: schema.ships.feedback,
      createdAt: schema.ships.createdAt,
      reviewedAt: schema.ships.reviewedAt,
      project: {
        id: schema.projects.id,
        name: schema.projects.name,
        description: schema.projects.description,
        bannerKey: schema.projects.bannerKey,
      },
      owner: { id: schema.users.id, identity: schema.users.identity },
    })
    .from(schema.ships)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.ships.projectId))
    .innerJoin(schema.users, eq(schema.users.id, schema.projects.userId))
    .where(eq(schema.ships.status, status as ShipStatus))
    .orderBy(status === 'pending' ? asc(schema.ships.createdAt) : desc(schema.ships.reviewedAt))
})
