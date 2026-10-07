// GET /api/me/eligibility — whether the user can ship. With ?refresh=1, asks Hack Club Auth
// again first. Only a yes/no, nothing about why.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const refresh = getQuery(event).refresh === '1'
  const eligibility = refresh ? await refreshEligibility(user.id) : await getEligibility(user.id)
  return { eligible: isEligible(eligibility) }
})
