// Identity returned by GET https://auth.hackclub.com/api/v1/me.
// Which fields are present depends on the scopes requested.
export interface AuthUser {
  id: string
  primary_email?: string
  first_name?: string
  last_name?: string
  slack_id?: string
  verification_status?: 'needs_submission' | 'pending' | 'verified' | 'ineligible'
  ysws_eligible?: boolean
}

declare module '#auth-utils' {
  // Only these fields are kept in the session (see server/routes/auth/hackclub.get.ts)
  interface User extends Pick<AuthUser, 'id' | 'first_name' | 'last_name'> {
    // From the users table, set on sign-in. Only for showing/hiding UI,
    // server routes should check the database with requireAdmin instead.
    isAdmin: boolean
  }
}
