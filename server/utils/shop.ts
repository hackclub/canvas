import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500
const MAX_DISCLAIMER_LENGTH = 1000
// Postgres `integer` tops out at 2,147,483,647
const MAX_AMOUNT = 2_000_000_000

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

const isWholeNumber = (value: unknown, min: number, max = MAX_AMOUNT): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max

// Fields that can be left out when creating an item, for the column's default
type OptionalField = 'showInApp' | 'showOnLanding' | 'showQuantity' | 'perUserLimit' | 'checkoutLimit' | 'checkoutLimitEnabled' | 'disclaimer' | 'silly' | 'requirePhone'

export interface ShopItemInput {
  name: string
  description: string
  price: number
  stock: number | null
  showInApp: boolean
  showOnLanding: boolean
  showQuantity: boolean
  perUserLimit: number | null
  checkoutLimit: number
  checkoutLimitEnabled: boolean
  disclaimer: string
  silly: boolean
  requirePhone: boolean
}

// Checks the fields of a shop item being created, or just the ones sent when `partial`
export function parseShopItem(body: Record<string, unknown> | undefined, partial: true): Partial<ShopItemInput>
export function parseShopItem(body: Record<string, unknown> | undefined, partial?: false): Omit<ShopItemInput, OptionalField> & Partial<Pick<ShopItemInput, OptionalField>>
export function parseShopItem(body: Record<string, unknown> | undefined, partial = false) {
  const item: Partial<ShopItemInput> = {}
  const has = (field: string) => !partial || body?.[field] !== undefined

  if (has('name')) {
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > MAX_NAME_LENGTH) {
      throw badRequest(`Name must be 1 to ${MAX_NAME_LENGTH} characters`)
    }
    item.name = name
  }
  if (has('description')) {
    const description = body?.description ?? ''
    if (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH) {
      throw badRequest(`Description must be text of at most ${MAX_DESCRIPTION_LENGTH} characters`)
    }
    item.description = description.trim()
  }
  if (has('price')) {
    const price = body?.price
    if (!isWholeNumber(price, 0)) {
      throw badRequest('Price must be a whole number of bonus points')
    }
    item.price = price
  }
  if (has('stock')) {
    // Null (or left out when creating) means there's no limit
    const stock = body?.stock ?? null
    if (stock !== null && !isWholeNumber(stock, 0)) {
      throw badRequest('Stock must be a whole number, or empty for no limit')
    }
    item.stock = stock
  }
  // These three can be left out when creating, for the column's default
  if (body?.perUserLimit !== undefined) {
    const limit = body.perUserLimit
    if (limit !== null && !isWholeNumber(limit, 1)) {
      throw badRequest('The per person limit must be at least 1, or empty for no limit')
    }
    item.perUserLimit = limit
  }
  if (body?.checkoutLimit !== undefined) {
    const limit = body.checkoutLimit
    if (!isWholeNumber(limit, 1, MAX_ORDER_QUANTITY)) {
      throw badRequest(`The checkout limit must be a whole number from 1 to ${MAX_ORDER_QUANTITY}`)
    }
    item.checkoutLimit = limit
  }
  if (body?.disclaimer !== undefined) {
    const disclaimer = body.disclaimer
    if (typeof disclaimer !== 'string' || disclaimer.length > MAX_DISCLAIMER_LENGTH) {
      throw badRequest(`Disclaimer must be text of at most ${MAX_DISCLAIMER_LENGTH} characters`)
    }
    item.disclaimer = disclaimer.trim()
  }
  for (const field of ['showInApp', 'showOnLanding', 'showQuantity', 'checkoutLimitEnabled', 'silly', 'requirePhone'] as const) {
    if (has(field)) {
      // Left out when creating means the column's default
      if (body?.[field] === undefined && !partial) continue
      if (typeof body?.[field] !== 'boolean') throw badRequest(`${field} must be true or false`)
      item[field] = body[field] as boolean
    }
  }
  return item
}

// Loads the shop item in the `id` route param, 404ing if there isn't one
export async function requireShopItem(event: H3Event) {
  const id = Number(getRouterParam(event, 'id'))
  const item = Number.isSafeInteger(id)
    ? await useDB().query.shopItems.findFirst({ where: eq(schema.shopItems.id, id) })
    : undefined
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Shop item not found' })
  }
  return item
}
