import { ilike, or, sql, type Column, type SQL } from 'drizzle-orm'
import type { H3Event } from 'h3'
import type { AdminAction } from '../../shared/types/audit'

type DB = ReturnType<typeof useDB>
// A transaction handle, so the log entry is only written if the change it describes is
type Tx = Parameters<Parameters<DB['transaction']>[0]>[0]

export const AUDIT_PAGE_SIZE = 50
// Longest search, so a huge ?q= can't be turned into a huge ILIKE pattern
const MAX_QUERY_LENGTH = 200

// Records something an admin did. Pass the transaction the change was made in.
export async function logAdminAction(
  tx: Tx | DB,
  adminId: string,
  entry: AdminAction,
  target: { userId?: string | null, projectId?: number | null } = {},
) {
  await tx.insert(schema.adminActions).values({
    adminId,
    action: entry.action,
    details: entry.details,
    targetUserId: target.userId ?? null,
    projectId: target.projectId ?? null,
  })
}

// Reads ?q= and ?page= for the audit log routes. Pages start at 1.
export function getAuditQuery(event: H3Event) {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, MAX_QUERY_LENGTH) : ''
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  return { query, q, page, offset: (page - 1) * AUDIT_PAGE_SIZE }
}

// Matches a user (or an alias of the users table) by ID, Slack ID, display names or real name
export function userMatches(
  users: Record<'id' | 'slackId' | 'slackDisplayName' | 'displayNameOverride' | 'identity', Column>,
  q: string,
): SQL {
  const pattern = `%${escapeLike(q)}%`
  const fullName = sql`concat_ws(' ', ${users.identity}->>'first_name', ${users.identity}->>'last_name')`
  return or(
    ilike(users.id, pattern),
    ilike(users.slackId, pattern),
    ilike(users.slackDisplayName, pattern),
    ilike(users.displayNameOverride, pattern),
    ilike(fullName, pattern),
  )!
}

// So searching for "100%" or "a_b" matches literally
export function escapeLike(q: string) {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`)
}
