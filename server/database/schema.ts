// Define tables here, then run `pnpm db:generate` + `pnpm db:migrate` (or `pnpm db:push`)
// to apply them. See server/api/db.get.ts for query examples.
import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

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
  // Pixels currency balance
  pixels: integer('pixels').notNull().default(0),
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

export type ShipStatus = 'pending' | 'approved' | 'rejected'

// Each time a project is submitted for review. While a ship is pending, the project is
// locked from edits so reviewers see exactly what was shipped.
export const ships = pgTable('ships', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status').$type<ShipStatus>().notNull().default('pending'),
  // Left by the reviewer, shown to the project's owner
  feedback: text('feedback').notNull().default(''),
  reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
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
