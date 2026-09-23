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
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface User extends AuthUser {}
}
