// Use after "auth": definePageMeta({ middleware: ["auth", "admin"] })
export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()
  if (!user.value?.isAdmin) {
    return navigateTo('/app')
  }
})
