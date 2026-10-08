// Shared between the project page (for estimates) and the server (for payouts)

const BONUS_POINTS_PER_HOUR = 5
// Pixels per hour for a project's first PIXEL_TIER_HOURS hours, then PIXELS_PER_HOUR_AFTER
const PIXELS_PER_HOUR = 10
const PIXEL_TIER_HOURS = 10
const PIXELS_PER_HOUR_AFTER = 5

// What a project has earned in total for `seconds` of Hackatime time. Each ship pays the
// difference between this at its time and at the last paid ship's, so a project's hours
// are only ever paid once and the 10 hour tier counts across all of its ships.
export function projectEarnings(seconds: number) {
  const hours = Math.max(0, seconds) / 3600
  return {
    // e.g. 1.5 hours is 8 points, 1.26 hours is 6
    bonusPoints: Math.round(hours * BONUS_POINTS_PER_HOUR),
    // Rounded up, e.g. 1.1 hours is 6 pixels
    pixels: Math.ceil(
      Math.min(hours, PIXEL_TIER_HOURS) * PIXELS_PER_HOUR
      + Math.max(0, hours - PIXEL_TIER_HOURS) * PIXELS_PER_HOUR_AFTER,
    ),
  }
}

