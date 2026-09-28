// The signed-in user's pixel balance, shared across components through the "pixels" key.
// Call refreshPixels() after anything that changes it.
export function usePixels() {
  const { data } = useFetch("/api/pixels", { key: "pixels" });
  const pixels = computed(() => data.value?.pixels ?? 0);
  return { pixels, refreshPixels: () => refreshNuxtData("pixels") };
}
