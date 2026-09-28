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
  interface User extends AuthUser {
    // From the users table, set on sign-in. Only for showing/hiding UI,
    // server routes should check the database with requireAdmin instead.
    isAdmin: boolean
  }
}
