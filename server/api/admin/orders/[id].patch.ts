import { and, eq, isNotNull, sql } from 'drizzle-orm'

// PATCH /api/admin/orders/:id { status } — marks a shop order as fulfilled, back to pending
// (not for silly items), or rejected. Rejecting gives the user their bonus points back and
// puts the stock back, so it's final: a rejected order can't be changed again.
export default defineEventHandler(async (event) => {
  const { user: me } = await requireAdmin(event)
  const id = getOrderId(event)
  const { status } = (await readBody<{ status?: OrderStatus }>(event)) ?? {}
  if (!status || !ORDER_STATUSES.has(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Status must be pending, fulfilled or rejected' })
  }

  return useDB().transaction(async (tx) => {
    // Locked so two admins can't both reject (and refund) it at once
    const [order] = await tx
      .select(orderColumns)
      .from(schema.shopOrders)
      .where(eq(schema.shopOrders.id, id))
      .for('update')
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
    if (order.status === status) return order
    if (order.status === 'rejected') {
      throw createError({ statusCode: 400, statusMessage: "Rejected orders have been refunded, so they can't be changed" })
    }
    // There's nothing to send out, so it would sit in the queue forever
    if (order.silly && status === 'pending') {
      throw createError({ statusCode: 400, statusMessage: "Silly orders can't go back to pending" })
    }

    const [updated] = await tx
      .update(schema.shopOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.shopOrders.id, id))
      .returning(orderColumns)

    if (status === 'rejected') {
      const total = order.price * order.quantity
      const [user] = await tx
        .update(schema.users)
        .set({ bonusPoints: sql`${schema.users.bonusPoints} + ${total}` })
        .where(eq(schema.users.id, order.userId))
        .returning({ bonusPoints: schema.users.bonusPoints })
      await tx.insert(schema.bonusPointTransactions).values({
        userId: order.userId,
        amount: total,
        balance: user!.bonusPoints,
        reason: 'shop',
        actorId: me.id,
        orderId: order.id,
      })
      if (order.itemId !== null) {
        await tx
          .update(schema.shopItems)
          .set({ stock: sql`${schema.shopItems.stock} + ${order.quantity}` })
          .where(and(eq(schema.shopItems.id, order.itemId), isNotNull(schema.shopItems.stock)))
      }
    }

    await logAdminAction(tx, me.id, {
      action: 'order.status',
      details: { orderId: order.id, itemName: order.itemName, from: order.status, to: status },
    }, { userId: order.userId })
    return updated!
  })
})
