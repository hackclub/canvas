// Shared between the project page and the server, so both agree on what a ship needs.
interface Shippable {
  description: string
  hackatimeProjects: string[]
  aiUsage: string
  demoUrl: string | null
  repoUrl: string | null
  bannerKey: string | null
}

// What's still missing before a project can be shipped, as messages for the user
export function shipBlockers(project: Shippable) {
  const blockers: string[] = []
  if (!project.bannerKey) blockers.push('Upload a banner')
  if (!project.description) blockers.push('Add a description')
  if (!project.hackatimeProjects.length) blockers.push('Link at least one Hackatime project')
  if (!project.aiUsage) blockers.push('Fill in the AI usage declaration')
  if (!project.demoUrl) blockers.push('Add a demo URL')
  if (!project.repoUrl) blockers.push('Add a GitHub URL')
  return blockers
}
