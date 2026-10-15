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
  // A Slack DM to some people (or everyone who hasn't unsubscribed), with how many it went to.
  // `message` is only set for custom messages.
  | { action: 'slack.message', details: { type: SlackMessageType, message: string, everyone: boolean, recipients: number } }

// The kinds of DM the bot sends: the automatic ones, and "custom" ones written by an admin
export type SlackMessageType = 'shipApproved' | 'shipRejected' | 'welcome' | 'nudge' | 'custom'

// Something the bot did, for the "bot" section of the audit log
export type BotLogEntry =
  // A DM, with what it said. `error` is set if it couldn't be sent.
  | { kind: 'message', details: { type: SlackMessageType, text: string, error?: string } }
  // Their double pixels deal turned on (until `until`) or off. "nudge" is the DM turning it on,
  // "paid" is it being used up by a ship, "admin" is an admin doing it.
  | { kind: 'boost', details: { enabled: boolean, until: string | null, reason: 'nudge' | 'paid' | 'admin' } }
