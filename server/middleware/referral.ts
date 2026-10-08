// Remembers a referral link (/?ref=<code>) in a cookie, for when the visitor signs up
// (server/routes/auth/hackclub.get.ts). Only the first one is kept for a week, so a
// later link can't take the credit.
export default defineEventHandler((event) => {
  if (getMethod(event) !== 'GET') return
  const { ref } = getQuery(event)
  if (typeof ref !== 'string') return
  const code = ref.toLowerCase()
  if (!REFERRAL_CODE_PATTERN.test(code) || getCookie(event, 'canvas_ref')) return
  setCookie(event, 'canvas_ref', code, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
})
