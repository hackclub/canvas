// GET /api/me/progress — where the user is on the home page to-do list, and whether they've
// been paid for finishing it (see POST /api/me/todo-reward)
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return userProgress(user.id)
})
