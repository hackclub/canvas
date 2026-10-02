// Opens a user's profile in the Hack Club Slack
export function slackProfileUrl(slackId: string) {
  return `https://hackclub.enterprise.slack.com/team/${encodeURIComponent(slackId)}`
}
