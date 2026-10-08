// How a user's Hack Club Auth verification and YSWS eligibility read in the admin panel.
// Null means it isn't known yet, e.g. they haven't signed in since it started being saved.
export function eligibilityLabel(user: { verificationStatus: string | null, yswsEligible: boolean | null }) {
  if (!user.verificationStatus) return 'unknown'
  if (user.verificationStatus === 'verified') return user.yswsEligible ? 'verified & eligible' : 'verified, not eligible'
  return {
    needs_submission: 'not submitted',
    pending: 'pending review',
    ineligible: 'ineligible',
  }[user.verificationStatus] ?? user.verificationStatus
}
