import { sql } from 'drizzle-orm'

// GET /api/admin/funnel — how many users have reached each step of getting started,
// in order. A step counts users who did it at any point, even if they've since undone it
// (e.g. a deleted project or a canvas pixel that was drawn over).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const [row] = await useDB().execute<Record<string, number>>(sql`
    select
      (select count(*) from users)::int as signed_in,
      (select count(*) from users where verification_status = 'verified' and ysws_eligible)::int as eligible,
      (select count(*) from users where hackatime is not null)::int as hackatime,
      (select count(*) from users where setup_rewarded_at is not null
        or exists (select 1 from projects where projects.user_id = users.id))::int as project,
      (select count(distinct user_id) from pixel_transactions where reason = 'canvas')::int as drawn,
      (select count(distinct projects.user_id) from ships join projects on projects.id = ships.project_id)::int as shipped
  `)
  return {
    steps: [
      { key: 'signed_in', label: 'signed in with Hack Club Auth', users: row!.signed_in },
      { key: 'eligible', label: 'verified & eligible', users: row!.eligible },
      { key: 'hackatime', label: 'linked Hackatime', users: row!.hackatime },
      { key: 'project', label: 'created a project', users: row!.project },
      { key: 'drawn', label: 'drew on the canvas', users: row!.drawn },
      { key: 'shipped', label: 'shipped a project', users: row!.shipped },
    ],
  }
})
