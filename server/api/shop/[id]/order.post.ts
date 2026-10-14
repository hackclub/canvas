import { and, eq, gte, ne, sql, sum } from 'drizzle-orm'

// Postgres `integer` tops out at 2,147,483,647
const MAX_TOTAL = 2_000_000_000

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

// POST /api/shop/:id/order { quantity, addressId, phoneNumber? } — buys a shop item with bonus
// points, shipped to one of the user's Hack Club Auth addresses (by its ID there). phoneNumber
// is for items that need one when the address has none. Silly items don't take an address,
// and their orders are fulfilled straight away.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const itemId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(itemId)) throw createError({ statusCode: 404, statusMessage: 'Shop item not found' })
  const body = await readBody<{ quantity?: unknown, addressId?: unknown, phoneNumber?: unknown }>(event)

  // Checked straight after, the cast is just so it reads as a number from here on
  const quantity = (body?.quantity ?? 1) as number
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_QUANTITY) {
    throw badRequest(`Quantity must be a whole number from 1 to ${MAX_ORDER_QUANTITY}`)
  }

  // Whether it needs an address, checked again once the item is locked below
  const found = await useDB().query.shopItems.findFirst({
    where: eq(schema.shopItems.id, itemId),
    columns: { silly: true },
  })
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Shop item not found' })

  let address: ShippingAddress | null = null
  if (!found.silly) {
    if (typeof body?.addressId !== 'string' || !body.addressId) throw badRequest('Pick an address to ship to')
    // Looked up here rather than taken from the request, so it's an address they really have
    const addresses = await fetchHcaAddresses(user.id)
    const picked = addresses.find((a) => a.id === body.addressId)
    if (!picked) throw badRequest("That address isn't on your Hack Club Auth account any more, pick another")
    address = toShippingAddress(picked)
  }

  return useDB().transaction(async (tx) => {
    // Locked so orders for the same item take turns, and stock and per person limits can't be
    // beaten by ordering several times at once
    const [item] = await tx
      .select()
      .from(schema.shopItems)
      .where(eq(schema.shopItems.id, itemId))
      .for('update')
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Shop item not found' })
    // An admin made it not silly in the meantime, so it needs an address after all
    if (!item.silly && !address) {
      throw createError({ statusCode: 409, statusMessage: 'This item changed, refresh the page and try again' })
    }
    // Checked against the locked item, so it holds even if an admin just turned it on
    if (item.requirePhone && address && !address.phoneNumber) {
      address.phoneNumber = parsePhoneNumber(body?.phoneNumber)
    }

    if (!item.showQuantity && quantity !== 1) throw badRequest('You can only order one of these at a time')
    if (item.checkoutLimitEnabled && quantity > item.checkoutLimit) {
      throw badRequest(`You can order at most ${item.checkoutLimit} of these at a time`)
    }
    if (item.stock !== null && item.stock < quantity) {
      throw badRequest(item.stock ? `There are only ${item.stock} left` : 'This is sold out')
    }
    if (item.perUserLimit !== null) {
      const [ordered] = await tx
        .select({ quantity: sum(schema.shopOrders.quantity).mapWith(Number) })
        .from(schema.shopOrders)
        .where(and(
          eq(schema.shopOrders.userId, user.id),
          eq(schema.shopOrders.itemId, item.id),
          ne(schema.shopOrders.status, 'rejected'),
        ))
      const already = ordered?.quantity ?? 0
      if (already + quantity > item.perUserLimit) {
        throw badRequest(already
          ? `You can get at most ${item.perUserLimit} of these, and you've already ordered ${already}`
          : `You can get at most ${item.perUserLimit} of these`)
      }
    }

    const total = item.price * quantity
    if (total > MAX_TOTAL) throw badRequest("That's too many!")

    // Only goes through if they can afford it, checked in the same statement so two orders
    // at once can't both spend the same points
    const [me] = await tx
      .update(schema.users)
      .set({ bonusPoints: sql`${schema.users.bonusPoints} - ${total}` })
      .where(and(eq(schema.users.id, user.id), gte(schema.users.bonusPoints, total)))
      .returning({ bonusPoints: schema.users.bonusPoints })
    if (!me) throw badRequest("You don't have enough bonus points")

    if (item.stock !== null) {
      await tx
        .update(schema.shopItems)
        .set({ stock: sql`${schema.shopItems.stock} - ${quantity}` })
        .where(eq(schema.shopItems.id, item.id))
    }
    const [order] = await tx
      .insert(schema.shopOrders)
      .values({
        userId: user.id,
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        quantity,
        status: item.silly ? 'fulfilled' : 'pending',
        address: address && !item.silly ? encryptAddress(address) : null,
      })
      .returning({ id: schema.shopOrders.id, status: schema.shopOrders.status })
    await tx.insert(schema.bonusPointTransactions).values({
      userId: user.id,
      amount: -total,
      balance: me.bonusPoints,
      reason: 'shop',
      orderId: order!.id,
    })

    setResponseStatus(event, 201)
    return { id: order!.id, status: order!.status, bonusPoints: me.bonusPoints }
  })
})
