// The signed-in user's pixel and bonus point balances, shared across components through the "pixels" key.
// Call refreshPixels() after anything that changes it.
export function usePixels() {
  const { data } = useFetch("/api/pixels", { key: "pixels" });
  // Pixels drawn on the canvas that the server hasn't taken off the balance yet
  const pending = useState("pixels-pending", () => 0);
  const pixels = computed(() =>
    Math.max(0, (data.value?.pixels ?? 0) - pending.value),
  );
  const bonusPoints = computed(() => data.value?.bonusPoints ?? 0);
  return {
    pixels,
    bonusPoints,
    pending,
    // For when a response already says what the balance is now
    setPixels: (value: number) =>
      (data.value = { bonusPoints: 0, ...data.value, pixels: value }),
    refreshPixels: () => refreshNuxtData("pixels"),
  };
}
