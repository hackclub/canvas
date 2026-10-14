export type OrderStatus = 'pending' | 'fulfilled' | 'rejected'

// A question asked at checkout, set up per item by admins. Only "choice" (pick one option)
// for now. IDs are kept when fields and options are renamed or moved, so answers match them.
export interface ShopItemField {
  id: string
  type: 'choice'
  title: string
  description: string
  required: boolean
  options: ShopItemFieldOption[]
}

export interface ShopItemFieldOption {
  id: string
  label: string
  // Extra bonus points for each one ordered, on top of the item's price
  price: number
}

// What someone picked for a field, copied onto the order so it doesn't change if the field
// is edited or removed later
export interface OrderChoice {
  fieldId: string
  field: string
  optionId: string
  option: string
  price: number
}

// Where an order ships to, copied from the user's Hack Club Auth address when they order
// so it doesn't change if they edit their addresses later. Stored encrypted, admins only.
export interface ShippingAddress {
  firstName: string
  lastName: string
  line1: string
  line2: string
  city: string
  state: string
  postalCode: string
  country: string
  phoneNumber: string
}
