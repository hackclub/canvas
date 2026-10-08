// Sends people who haven't finished setup (linked Hackatime, made a first project) to it,
// starting from the introduction, so it can't be skipped by going straight to a page. Checked once per session, then remembered.
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/app') || to.path.startsWith('/app/setup')) return
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return

  const done = useState('setup-done', () => false)
  if (done.value) return

  const setup = await $fetch('/api/me/setup', { headers: useRequestHeaders(['cookie']) })
  if (setup.hackatimeLinked && setup.projectCreated) {
    done.value = true
    return
  }
  return navigateTo(setup.hackatimeLinked ? '/app/setup/finish' : '/app/setup/introduction')
})
