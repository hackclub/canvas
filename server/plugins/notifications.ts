// Sends the scheduled Slack DMs (welcome, "you haven't started yet") every minute, see
// sendScheduledMessages. Only in production, so a dev server never DMs people, and only
// once Slack and SITE_URL are set up.
const INTERVAL = 60 * 1000

export default defineNitroPlugin(() => {
  if (import.meta.dev) return
  if (!canSendSlack()) {
    console.warn('Scheduled Slack DMs are off: set SLACK_XOXB and SITE_URL to send them')
    return
  }

  let running = false
  setInterval(async () => {
    // A slow run (e.g. Slack rate limiting) isn't overlapped by the next one
    if (running) return
    running = true
    try {
      await sendScheduledMessages()
    } catch (error) {
      console.error('Failed to send scheduled Slack DMs:', error)
    } finally {
      running = false
    }
  }, INTERVAL)
})
