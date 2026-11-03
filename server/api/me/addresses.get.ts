// GET /api/me/addresses — the signed-in user's own Hack Club Auth addresses, primary first,
// for picking one at checkout. Only a one-line summary of each (and whether it has a phone
// number, for items that need one): orders look the full address up again on the server by ID.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  // Each call goes to Hack Club Auth
  await rateLimit(event, 'hca', 20, MINUTE)
  const addresses = await fetchHcaAddresses(user.id)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return addresses.map((a) => ({
    id: a.id,
    // e.g. "Orpheus Hacksworth - 15 Falls Rd, Shelburne"
    label: `${[a.first_name, a.last_name].filter(Boolean).join(' ')} - ${[a.line_1, a.city].filter(Boolean).join(', ')}`,
    primary: !!a.primary,
    hasPhone: !!a.phone_number?.trim(),
  }))
})
