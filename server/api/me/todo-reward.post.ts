// POST /api/me/todo-reward — pays the pixels for finishing the home page to-do list, once.
// Everything is checked here, so it can be called whenever the list looks done.
// `pixels` is their new balance if this paid it, null if it didn't (not done, or already paid).
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return { pixels: await payTodoReward(user.id), amount: TODO_REWARD_PIXELS }
})
