// The signed-in user's pixel balance, shared across components through the "pixels" key.
// Call refreshPixels() after anything that changes it.
export function usePixels() {
  const { data } = useFetch("/api/pixels", { key: "pixels" });
  // Pixels drawn on the canvas that the server hasn't taken off the balance yet
  const pending = useState("pixels-pending", () => 0);
  const pixels = computed(() =>
    Math.max(0, (data.value?.pixels ?? 0) - pending.value),
  );
  return {
    pixels,
    pending,
    // For when a response already says what the balance is now
    setPixels: (value: number) => (data.value = { pixels: value }),
    refreshPixels: () => refreshNuxtData("pixels"),
  };
}
