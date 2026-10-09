// Define tables here, then run `pnpm db:generate` + `pnpm db:migrate` (or `pnpm db:push`)
// to apply them. See server/api/db.get.ts for query examples.
import { sql } from 'drizzle-orm'
import { type AnyPgColumn, bigint, boolean, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import type { AdminAction } from '../../shared/types/audit'
import type { AuthUser } from '../../shared/types/auth'
import type { ShipJustification, ShipStatus } from '../../shared/types/ships'

// Profile from Hack Club Auth, refreshed on every sign-in
export interface UserIdentity {
  first_name?: string
  last_name?: string
}

// Hack Club Auth token from the user's last sign-in, for reading their address and birthday
// when their ships are synced to Airtable. Kept out of `identity`, which admin lists return.
export interface UserHca {
  // Encrypted, see encryptToken (server/utils/tokens.ts)
  access_token: string
  // When it was issued (ISO 8601). Tokens last 6 months.
  created_at: string
}

// Linked Hackatime account, set by /auth/hackatime
export interface UserHackatime {
  // Encrypted, see encryptToken (server/utils/tokens.ts)
  access_token: string
  // When Hackatime issued the token (ISO 8601)
  created_at: string
}

export const users = pgTable('users', {
  // Hack Club Auth identity ID, e.g. "ident!abc123"
  id: text('id').primaryKey(),
  identity: jsonb('identity').$type<UserIdentity>().notNull().default({}),
  // Set by /auth/hackclub on every sign-in
  hca: jsonb('hca').$type<UserHca>(),
  hackatime: jsonb('hackatime').$type<UserHackatime>(),
  // From Hack Club Auth on sign-in, null if they haven't linked Slack
  slackId: text('slack_id'),
  // Slack display name, refreshed from Slack on every sign-in. Null if they haven't linked
  // Slack or haven't set one.
  slackDisplayName: text('slack_display_name'),
  // Set by the user in account settings, shown instead of their Slack display name.
  // Use publicName() (server/utils/users.ts) rather than reading these two directly.
  displayNameOverride: text('display_name_override'),
  // Hackatime user ID, set by /auth/hackatime. Unique so one Hackatime account can't be
  // linked to several Canvas accounts and paid for the same hours more than once.
  hackatimeId: integer('hackatime_id').unique(),
  // From Hack Club Auth (the verification_status scope), refreshed on sign-in and by
  // /api/me/eligibility. Null until known, e.g. for users from before this was saved.
  verificationStatus: text('verification_status').$type<NonNullable<AuthUser['verification_status']>>(),
  yswsEligible: boolean('ysws_eligible'),
  // When they got the pixel for creating their first project in setup. Kept even if the
  // project is deleted, so deleting and recreating can't earn it again.
  setupRewardedAt: timestamp('setup_rewarded_at', { withTimezone: true }),
  // Pay-as-you-code only counts time on Hackatime projects linked to a Canvas project, after
  // the total each had when it was first seen: Hackatime project name -> total seconds then.
  // See syncCodingPixels (server/utils/coding.ts).
  codingBaselines: jsonb('coding_baselines').$type<Record<string, number>>().notNull().default({}),
  // Whole hours of counted time that have already been paid for
  codingHoursPaid: integer('coding_hours_paid').notNull().default(0),
  // Their referral link is /?ref=<code>. Made the first time they look at it.
  referralCode: text('referral_code').unique(),
  // Who referred them, set when they first sign up through that link and never changed
  referredBy: text('referred_by').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  // When the person who referred them was paid for them, so it only happens once
  referralRewardedAt: timestamp('referral_rewarded_at', { withTimezone: true }),
  // When they first signed in, for the admin graphs
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Seconds on the Hackatime projects linked to their projects (since HACKATIME_START) the
  // last time pay-as-you-code looked, for the admin graphs' unshipped hours
  linkedSecondsSeen: integer('linked_seconds_seen').notNull().default(0),
  // Seconds on each linked Hackatime project when pay-as-you-code last looked, to work out how
  // much time came in since (see userCodingDays)
  codingSeen: jsonb('coding_seen').$type<Record<string, number>>().notNull().default({}),
  // Pixels currency balance, spent on the canvas
  pixels: integer('pixels').notNull().default(0),
  // Bonus points currency balance, spent in the shop
  bonusPoints: integer('bonus_points').notNull().default(0),
  isAdmin: boolean('is_admin').notNull().default(false),
  // Set by admins, stops them drawing on the canvas (see placePixels in server/utils/canvas.ts)
  canvasBanned: boolean('canvas_banned').notNull().default(false),
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
  // Set by the reviewer: pixels for this ship are multiplied (COOKING_MULTIPLIER in server/utils/payouts.ts)
  cooking: boolean('cooking').notNull().default(false),
  // Written by the reviewer when they review it, sent to Airtable when it's approved
  justification: jsonb('justification').$type<ShipJustification>(),
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

// Every pixel ever drawn, in order, for making a timelapse of the canvas afterwards. Only ever
// added to: canvas_pixels holds the current board, this holds how it got there. Replay it
// by id (or placed_at), drawing each row over the last. The user is kept as null if they're
// deleted, so the timelapse stays complete.
export const canvasPixelLog = pgTable('canvas_pixel_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  x: smallint('x').notNull(),
  y: smallint('y').notNull(),
  // 0xRRGGBB
  color: integer('color').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  placedAt: timestamp('placed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('canvas_pixel_log_placed_at_idx').on(t.placedAt)])

// Why a user's pixel balance changed
export type PixelTransactionReason = 'canvas' | 'admin' | 'ship' | 'coding' | 'setup' | 'referral'

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
  // Whether it's in the carousel on the app home page, and on the public landing page
  showInApp: boolean('show_in_app').notNull().default(true),
  showOnLanding: boolean('show_on_landing').notNull().default(false),
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

// One row per user per hour they made an authenticated request, for the admin activity graphs.
// Daily active users are counted from these (and kept in daily_active_users once a day is over).
export const userActivity = pgTable('user_activity', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Start of the hour (UTC)
  hour: timestamp('hour', { withTimezone: true }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.hour] }),
  index('user_activity_hour_idx').on(t.hour),
])

// Hourly record of hours coded but not shipped yet, for the admin graphs. Unlike the other
// graphs this can't be worked out from older data afterwards, so it's saved as it goes.
export const statSnapshots = pgTable('stat_snapshots', {
  // Start of the hour (UTC)
  hour: timestamp('hour', { withTimezone: true }).primaryKey(),
  unshippedSeconds: integer('unshipped_seconds').notNull(),
})

// Daily active logins (people who made a request, whatever they did) for each UTC day that's
// over, so the admin graphs don't count the hourly rows again every time. A day is saved the
// first time it's asked for after it ends, and then never changes (even if a user is deleted
// later), the current day is always counted live.
export const dailyActiveLogins = pgTable('daily_active_logins', {
  // Start of the day (UTC)
  day: timestamp('day', { withTimezone: true }).primaryKey(),
  users: integer('users').notNull(),
})

// How long each user coded on their linked Hackatime projects each UTC day, for the admin
// graph of daily active users (people who coded at least 15 minutes). Added up from the time
// each pay-as-you-code sync finds (see syncCodingPixels), so it only knows about days they
// opened Canvas and the time lands on the day it was noticed.
export const userCodingDays = pgTable('user_coding_days', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Start of the day (UTC)
  day: timestamp('day', { withTimezone: true }).notNull(),
  seconds: integer('seconds').notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.day] }),
  index('user_coding_days_day_idx').on(t.day),
])
