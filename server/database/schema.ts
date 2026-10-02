// Define tables here, then run `pnpm db:generate` + `pnpm db:migrate` (or `pnpm db:push`)
// to apply them. See server/api/db.get.ts for query examples.
import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import type { AdminAction } from '../../shared/types/audit'
import type { ShipStatus } from '../../shared/types/ships'

// Profile from Hack Club Auth, refreshed on every sign-in
export interface UserIdentity {
  first_name?: string
  last_name?: string
}

// Linked Hackatime account, set by /auth/hackatime
export interface UserHackatime {
  access_token: string
  // When Hackatime issued the token (ISO 8601)
  created_at: string
}

export const users = pgTable('users', {
  // Hack Club Auth identity ID, e.g. "ident!abc123"
  id: text('id').primaryKey(),
  identity: jsonb('identity').$type<UserIdentity>().notNull().default({}),
  hackatime: jsonb('hackatime').$type<UserHackatime>(),
  // From Hack Club Auth on sign-in, null if they haven't linked Slack
  slackId: text('slack_id'),
  // Slack display name, refreshed from Slack on every sign-in. Null if they haven't linked
  // Slack or haven't set one.
  slackDisplayName: text('slack_display_name'),
  // Set by the user in account settings, shown instead of their Slack display name.
  // Use publicName() (server/utils/users.ts) rather than reading these two directly.
  displayNameOverride: text('display_name_override'),
  // Hackatime user ID, set by /auth/hackatime
  hackatimeId: integer('hackatime_id'),
  // Pixels currency balance, spent on the canvas
  pixels: integer('pixels').notNull().default(0),
  // Bonus points currency balance, spent in the shop
  bonusPoints: integer('bonus_points').notNull().default(0),
  isAdmin: boolean('is_admin').notNull().default(false),
})

// Projects are software-only, since time is tracked through Hackatime
export const projects = pgTable('projects', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  // Names of the user's Hackatime projects whose time counts towards this project.
  // A Hackatime project can only be linked to one project, so time isn't counted twice.
  hackatimeProjects: text('hackatime_projects').array().notNull().default(sql`'{}'::text[]`),
  aiUsage: text('ai_usage').notNull().default(''),
  // Started before Canvas, or previously shipped to another Hack Club event
  preexisting: boolean('preexisting').notNull().default(false),
  demoUrl: text('demo_url'),
  repoUrl: text('repo_url'),
  // R2 object key of the banner image, served at /images/<key>
  bannerKey: text('banner_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('projects_user_id_idx').on(t.userId)])

export type { ShipStatus }

// Each time a project is submitted for review. While a ship is pending, the project is
// locked from edits so reviewers see exactly what was shipped.
export const ships = pgTable('ships', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status').$type<ShipStatus>().notNull().default('pending'),
  // Left by the reviewer, shown to the project's owner
  feedback: text('feedback').notNull().default(''),
  reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  // The project's total Hackatime time when it was shipped. Null for ships from before
  // this was recorded, which use the time when they're approved instead.
  hackatimeSeconds: integer('hackatime_seconds'),
  // Paid out the first time the ship is approved (see server/utils/payouts.ts), null until then.
  // Changing the status afterwards doesn't take them back or pay them again.
  pixelsAwarded: integer('pixels_awarded'),
  bonusPointsAwarded: integer('bonus_points_awarded'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
}, (t) => [
  index('ships_project_id_idx').on(t.projectId),
  index('ships_status_idx').on(t.status),
  // Only one ship per project can be in review at a time
  uniqueIndex('ships_one_pending_per_project').on(t.projectId).where(sql`${t.status} = 'pending'`),
])

// Current state of the canvas, one row per pixel that's been drawn on. The server keeps
// its own copy in memory (server/utils/canvas.ts); this is what it's loaded from on startup.
export const canvasPixels = pgTable('canvas_pixels', {
  x: smallint('x').notNull(),
  y: smallint('y').notNull(),
  // 0xRRGGBB
  color: integer('color').notNull(),
  // Who drew it last
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  placedAt: timestamp('placed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.x, t.y] })])

// Why a user's pixel balance changed
export type PixelTransactionReason = 'canvas' | 'admin' | 'ship'

// Every change to a user's pixel balance, for the admin audit log
export const pixelTransactions = pgTable('pixel_transactions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Positive when pixels were given, negative when they were taken or spent
  amount: integer('amount').notNull(),
  // The user's balance right after the change
  balance: integer('balance').notNull(),
  reason: text('reason').$type<PixelTransactionReason>().notNull(),
  // The admin who changed it, for reason "admin"
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  // The approved ship that paid it, for reason "ship"
  shipId: integer('ship_id').references(() => ships.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('pixel_transactions_user_id_idx').on(t.userId),
  index('pixel_transactions_created_at_idx').on(t.createdAt),
])

// Why a user's bonus points changed. Shop purchases will add a reason here.
export type BonusPointTransactionReason = 'admin' | 'ship'

// Every change to a user's bonus points, for the admin audit log
export const bonusPointTransactions = pgTable('bonus_point_transactions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Positive when points were given, negative when they were taken or spent
  amount: integer('amount').notNull(),
  // The user's balance right after the change
  balance: integer('balance').notNull(),
  reason: text('reason').$type<BonusPointTransactionReason>().notNull(),
  // The admin who changed it, for reason "admin"
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  // The approved ship that paid it, for reason "ship"
  shipId: integer('ship_id').references(() => ships.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('bonus_point_transactions_user_id_idx').on(t.userId),
  index('bonus_point_transactions_created_at_idx').on(t.createdAt),
])

// Things people can buy with bonus points, managed in the admin panel
export const shopItems = pgTable('shop_items', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  // R2 object key of the banner image, served at /images/<key>
  bannerKey: text('banner_key'),
  // Bonus points needed to buy one
  price: integer('price').notNull(),
  // How many can be bought in total, null for no limit
  stock: integer('stock'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Every change made through the admin API, for the admin audit log
export const adminActions = pgTable('admin_actions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  adminId: text('admin_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').$type<AdminAction['action']>().notNull(),
  details: jsonb('details').$type<AdminAction['details']>().notNull(),
  // The user the action was done to (for ships, the project's owner)
  targetUserId: text('target_user_id').references(() => users.id, { onDelete: 'set null' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('admin_actions_created_at_idx').on(t.createdAt)])
