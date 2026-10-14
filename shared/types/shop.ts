export type OrderStatus = 'pending' | 'fulfilled' | 'rejected'

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
