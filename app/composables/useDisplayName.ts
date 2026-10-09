// The signed-in user's display name: their override, else their Slack display name, else
// their first name. Shared through the "display-name" key, so saving it on /app/me updates
// it everywhere.
export function useDisplayName() {
  const { user } = useUserSession();
  const { data } = useFetch("/api/me/display-name", { key: "display-name" });
  return computed(
    () =>
      data.value?.displayNameOverride ||
      data.value?.slackDisplayName ||
      user.value?.first_name ||
      "",
  );
}
