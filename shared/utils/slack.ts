import type { SlackMessageType } from '../types/audit'

// The #canvas channel in the Hack Club Slack
export const CANVAS_CHANNEL_ID = 'CN271UYS0'

// Opens a user's profile in the Hack Club Slack
export function slackProfileUrl(slackId: string) {
  return `https://hackclub.enterprise.slack.com/team/${encodeURIComponent(slackId)}`
}

// How each kind of bot DM is described in the admin panel
export const SLACK_MESSAGE_LABELS: Record<SlackMessageType, string> = {
  shipApproved: 'the ship approved DM',
  shipRejected: 'the ship rejected DM',
  welcome: 'the welcome DM',
  nudge: 'the double pixels nudge',
  custom: 'a message',
}
