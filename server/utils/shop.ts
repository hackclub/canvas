import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500
const MAX_DISCLAIMER_LENGTH = 1000
const MAX_FIELDS = 10
const MAX_OPTIONS = 20
const MAX_FIELD_TITLE_LENGTH = 100
const MAX_FIELD_DESCRIPTION_LENGTH = 500
const MAX_OPTION_LABEL_LENGTH = 100
// Postgres `integer` tops out at 2,147,483,647
const MAX_AMOUNT = 2_000_000_000

function badRequest(statusMessage: string) {
  return createError({ statusCode: 400, statusMessage })
}

const isWholeNumber = (value: unknown, min: number, max = MAX_AMOUNT): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max

// Fields that can be left out when creating an item, for the column's default
type OptionalField = 'showInApp' | 'showOnLanding' | 'showQuantity' | 'perUserLimit' | 'checkoutLimit' | 'checkoutLimitEnabled' | 'disclaimer' | 'silly' | 'requirePhone' | 'pixels' | 'fields'

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
  pixels: number | null
  fields: ShopItemField[]
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
  // Can be left out when creating, for an item that isn't pixels
  if (body?.pixels !== undefined) {
    const pixels = body.pixels
    if (pixels !== null && !isWholeNumber(pixels, 1)) {
      throw badRequest('Pixels must be a whole number of at least 1, or empty for an item that isn\'t pixels')
    }
    item.pixels = pixels
  }
  if (body?.fields !== undefined) item.fields = parseShopItemFields(body.fields)
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

// Pixel items have nothing to send out, so they have to be silly. `current` is the item being
// changed, for the fields that aren't.
export function checkPixelItem(input: Partial<ShopItemInput>, current?: { pixels: number | null, silly: boolean }) {
  const pixels = input.pixels !== undefined ? input.pixels : current?.pixels ?? null
  const silly = input.silly ?? current?.silly ?? false
  if (pixels !== null && !silly) throw badRequest('Pixel items have nothing to send out, so they have to be silly')
}

// Keeps an ID the admin page sent (so answers to a field keep matching it after edits), or
// makes a new one for something just added
function keepOrMakeId(id: unknown, taken: Set<string>) {
  const kept = typeof id === 'string' && /^[\w-]{1,40}$/.test(id) && !taken.has(id) ? id : null
  const result = kept ?? crypto.randomUUID().slice(0, 8)
  taken.add(result)
  return result
}

// Checks the checkout fields of a shop item (see ShopItemField)
function parseShopItemFields(value: unknown): ShopItemField[] {
  if (!Array.isArray(value) || value.length > MAX_FIELDS) {
    throw badRequest(`Fields must be a list of at most ${MAX_FIELDS}`)
  }
  const fieldIds = new Set<string>()
  return value.map((raw, i) => {
    const field = (raw ?? {}) as Record<string, unknown>
    const which = `Field ${i + 1}`
    if (field.type !== 'choice') throw badRequest(`${which} must be a multiple choice field`)
    const title = typeof field.title === 'string' ? field.title.trim() : ''
    if (!title || title.length > MAX_FIELD_TITLE_LENGTH) {
      throw badRequest(`${which} needs a title of 1 to ${MAX_FIELD_TITLE_LENGTH} characters`)
    }
    const description = field.description ?? ''
    if (typeof description !== 'string' || description.length > MAX_FIELD_DESCRIPTION_LENGTH) {
      throw badRequest(`The description of "${title}" can be at most ${MAX_FIELD_DESCRIPTION_LENGTH} characters`)
    }
    if (typeof field.required !== 'boolean') throw badRequest(`Whether "${title}" is required must be true or false`)
    if (!Array.isArray(field.options) || !field.options.length || field.options.length > MAX_OPTIONS) {
      throw badRequest(`"${title}" needs 1 to ${MAX_OPTIONS} options`)
    }
    const optionIds = new Set<string>()
    const options = field.options.map((rawOption, j) => {
      const option = (rawOption ?? {}) as Record<string, unknown>
      const label = typeof option.label === 'string' ? option.label.trim() : ''
      if (!label || label.length > MAX_OPTION_LABEL_LENGTH) {
        throw badRequest(`Option ${j + 1} of "${title}" needs a name of 1 to ${MAX_OPTION_LABEL_LENGTH} characters`)
      }
      const price = option.price ?? 0
      if (!isWholeNumber(price, 0)) {
        throw badRequest(`The extra cost of "${label}" in "${title}" must be a whole number of bonus points`)
      }
      return { id: keepOrMakeId(option.id, optionIds), label, price }
    })
    return {
      id: keepOrMakeId(field.id, fieldIds),
      type: 'choice' as const,
      title,
      description: description.trim(),
      required: field.required,
      options,
    }
  })
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
