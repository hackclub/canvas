// The #canvas channel in the Hack Club Slack
export const CANVAS_CHANNEL_ID = 'CN271UYS0'

// Opens a user's profile in the Hack Club Slack
export function slackProfileUrl(slackId: string) {
  return `https://hackclub.enterprise.slack.com/team/${encodeURIComponent(slackId)}`
}
