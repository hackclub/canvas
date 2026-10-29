import { GUIDE_STEPS, type GuideSignal, type GuideStep } from "~/utils/guide";

interface GuideState {
  step: GuideStep;
  // The project they're linking Hackatime to, the first step happens on its page
  projectId: string;
}

// Where each step takes place. `finalize` and `paint` happen on whichever page they're on
// when they head to the canvas.
function pathFor(step: GuideStep, projectId: string) {
  if (step === "link") return `/app/projects/${projectId}`;
  if (step === "paint") return "/app/canvas";
  if (step === "shop") return "/app/shop";
  if (step === "home") return "/app";
  return null;
}

// Progress through the interactive guide, kept in a cookie so it survives reloads. Only people
// who've just finished setup have one, so nobody else sees the guide.
export function useGuide() {
  const route = useRoute();
  const state = useCookie<GuideState | null>("canvas-guide", {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    default: () => null,
  });

  const step = computed(() => state.value?.step ?? null);
  const { canvasClosed } = useRuntimeConfig().public;
  const config = computed(() => {
    const c = step.value ? GUIDE_STEPS[step.value] : null;
    return c?.ifCanvasClosed && canvasClosed ? { ...c, lines: c.ifCanvasClosed } : c;
  });
  const path = computed(() =>
    state.value ? pathFor(state.value.step, state.value.projectId) : null,
  );

  function start(projectId: string) {
    state.value = { step: "link", projectId };
  }

  // Moves on, taking them to the page the next step is on
  async function go(next: GuideStep) {
    if (!state.value) return;
    state.value = { ...state.value, step: next };
    const to = pathFor(next, state.value.projectId);
    if (to && route.path !== to) await navigateTo(to);
  }

  // Pages tell the guide what the player just did
  const signaled = useState<GuideSignal | null>("guide-signal", () => null);
  function signal(name: GuideSignal) {
    if (state.value) signaled.value = name;
  }

  function finish() {
    state.value = null;
  }

  // The canvas calls this when pixels were drawn
  function painted() {
    if (step.value === "paint") return go("shop");
  }

  return { step, config, path, state, signaled, start, go, signal, finish, painted };
}
