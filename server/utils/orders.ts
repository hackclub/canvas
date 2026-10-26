import type { H3Event } from 'h3'
import { sql } from 'drizzle-orm'

// Most of one item in a single order, whatever the item's checkout limit
export const MAX_ORDER_QUANTITY = 1000

export const ORDER_STATUSES = new Set<OrderStatus>(['pending', 'fulfilled', 'rejected'])

// A phone number typed in at checkout, for items that need one when the address has none.
// Loose, since formats vary by country: digits with the usual separators, and at least 6 digits.
export function parsePhoneNumber(value: unknown) {
  const phone = typeof value === 'string' ? value.trim() : ''
  if (!phone) {
    throw createError({ statusCode: 400, statusMessage: 'This item needs a phone number, add one to your order' })
  }
  if (phone.length > 30 || !/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 6) {
    throw createError({ statusCode: 400, statusMessage: "That doesn't look like a phone number" })
  }
  return phone
}

// Checks what someone picked for an item's fields at checkout ({ fieldId: optionId }) and
// works out what the options add to the price of each one. Picks for fields or options that
// don't exist (any more) are refused, so a changed item can't be ordered from an old page.
export function parseChoices(fields: ShopItemField[], value: unknown) {
  const picked = (value ?? {}) as Record<string, unknown>
  if (typeof picked !== 'object' || Array.isArray(picked)) {
    throw createError({ statusCode: 400, statusMessage: 'Choices must be an object of field IDs to option IDs' })
  }
  const changed = createError({ statusCode: 409, statusMessage: 'This item changed, refresh the page and try again' })
  if (Object.keys(picked).some((id) => !fields.some((f) => f.id === id))) throw changed

  const choices: OrderChoice[] = []
  for (const field of fields) {
    const optionId = picked[field.id]
    if (optionId == null || optionId === '') {
      if (field.required) throw createError({ statusCode: 400, statusMessage: `Pick an option for "${field.title}"` })
      continue
    }
    const option = field.options.find((o) => o.id === optionId)
    if (!option) throw changed
    choices.push({ fieldId: field.id, field: field.title, optionId: option.id, option: option.label, price: option.price })
  }
  return { choices, extra: choices.reduce((sum, c) => sum + c.price, 0) }
}

// Shipping addresses are stored encrypted, like OAuth tokens
export function encryptAddress(address: ShippingAddress) {
  return encryptToken(JSON.stringify(address))
}

// Only for admin routes: the address must never be sent to anyone else
export function decryptAddress(stored: string): ShippingAddress {
  return JSON.parse(decryptToken(stored))
}

// Every column of an order except the address, for anything that isn't showing it to an admin
export const orderColumns = {
  id: schema.shopOrders.id,
  userId: schema.shopOrders.userId,
  itemId: schema.shopOrders.itemId,
  itemName: schema.shopOrders.itemName,
  price: schema.shopOrders.price,
  quantity: schema.shopOrders.quantity,
  pixels: schema.shopOrders.pixels,
  choices: schema.shopOrders.choices,
  status: schema.shopOrders.status,
  createdAt: schema.shopOrders.createdAt,
  updatedAt: schema.shopOrders.updatedAt,
  // For a silly item, so there's nothing to send out. Says whether there's an address, not what it is.
  silly: sql<boolean>`${schema.shopOrders.address} is null`.as('silly'),
}

// The order ID in the `id` route param, 404ing if it isn't a number
export function getOrderId(event: H3Event) {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }
  return id
}
