const SESSION_CONFIG_KEY = "session-config";

function readSessionConfig() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_CONFIG_KEY) ?? "null") ?? {};
  } catch {
    return {};
  }
}

// Best-effort reduce motion toggle, saved in localStorage. Separate from the OS
// setting (prefers-reduced-motion), which always turns animations off.
export function useReduceMotion() {
  const reduceMotion = useState("reduce-motion", () => false);

  // localStorage only exists client-side, so read it after mount
  onMounted(() => {
    reduceMotion.value = readSessionConfig()["best-effort-reducemotion"] === true;
  });

  function toggleReduceMotion() {
    reduceMotion.value = !reduceMotion.value;
    localStorage.setItem(
      SESSION_CONFIG_KEY,
      JSON.stringify({
        ...readSessionConfig(),
        "best-effort-reducemotion": reduceMotion.value,
      }),
    );
  }

  return { reduceMotion, toggleReduceMotion };
}
