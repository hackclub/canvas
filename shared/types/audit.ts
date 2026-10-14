import type { ShipStatus } from './ships'
import type { OrderStatus } from './shop'

// An admin changing one of a user's balances
interface BalanceChangeDetails {
  op: 'set' | 'add'
  amount: number
  before: number
  after: number
}

// Something an admin did, and the details needed to show it in the audit log.
// Shared so the audit log page can narrow `details` by `action`.
export type AdminAction =
  | { action: 'user.pixels', details: BalanceChangeDetails }
  | { action: 'user.bonusPoints', details: BalanceChangeDetails }
  | { action: 'user.admin', details: { isAdmin: boolean } }
  | { action: 'user.canvasBan', details: { banned: boolean } }
  | { action: 'ship.review', details: { shipId: number, status: ShipStatus, feedback: string } }
  | { action: 'ship.override', details: { shipId: number, from: ShipStatus, to: ShipStatus, feedback: string } }
  | { action: 'shop.create', details: { itemId: number, name: string } }
  // `changes` lists the fields that changed, e.g. ["price", "banner"]
  | { action: 'shop.update', details: { itemId: number, name: string, changes: string[] } }
  | { action: 'shop.delete', details: { itemId: number, name: string } }
  | { action: 'order.status', details: { orderId: number, itemName: string, from: OrderStatus, to: OrderStatus } }
