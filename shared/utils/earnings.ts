// Shared between the project page (for estimates) and the server (for payouts)

const BONUS_POINTS_PER_HOUR = 5
const PIXELS_PER_HOUR = 10

// What a project has earned in total for `seconds` of Hackatime time. Each ship pays the
// difference between this at its time and at the last paid ship's, so a project's hours
// are only ever paid once.
export function projectEarnings(seconds: number) {
  const hours = Math.max(0, seconds) / 3600
  return {
    // e.g. 1.5 hours is 8 points, 1.26 hours is 6
    bonusPoints: Math.round(hours * BONUS_POINTS_PER_HOUR),
    // Rounded up, e.g. 1.11 hours is 12 pixels
    pixels: Math.ceil(hours * PIXELS_PER_HOUR),
  }
}

