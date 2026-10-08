import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500
// Postgres `integer` tops out at 2,147,483,647
const MAX_AMOUNT = 2_000_000_000

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

export interface ShopItemInput {
  name: string
  description: string
  price: number
  stock: number | null
  showInApp: boolean
  showOnLanding: boolean
}

// Checks the fields of a shop item being created, or just the ones sent when `partial`
export function parseShopItem(body: Record<string, unknown> | undefined, partial: true): Partial<ShopItemInput>
export function parseShopItem(body: Record<string, unknown> | undefined, partial?: false): Omit<ShopItemInput, 'showInApp' | 'showOnLanding'> & Partial<Pick<ShopItemInput, 'showInApp' | 'showOnLanding'>>
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
    if (!Number.isInteger(price) || (price as number) < 0 || (price as number) > MAX_AMOUNT) {
      throw badRequest('Price must be a whole number of bonus points')
    }
    item.price = price as number
  }
  if (has('stock')) {
    // Null (or left out when creating) means there's no limit
    const stock = body?.stock ?? null
    if (stock !== null && (!Number.isInteger(stock) || (stock as number) < 0 || (stock as number) > MAX_AMOUNT)) {
      throw badRequest('Stock must be a whole number, or empty for no limit')
    }
    item.stock = stock as number | null
  }
  for (const field of ['showInApp', 'showOnLanding'] as const) {
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
