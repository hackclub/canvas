<template>
  <template v-if="config">
    <!-- dims everything but the highlighted thing, without blocking clicks on it. Sits on the
         page (not fixed to the screen) so it scrolls along with what it's highlighting. -->
    <Teleport to="body">
      <Transition name="guide-fade">
        <div
          v-if="box"
          class="pointer-events-none z-55 border-4"
          :class="[
            box.fixed ? 'fixed' : 'absolute',
            { 'guide-slide': sliding },
            current?.dim === false
              ? 'guide-pulse border-black'
              : [
                  'guide-spotlight',
                  current?.border === 'black' ? 'border-black' : 'border-white',
                ],
          ]"
          :style="{
            left: `${box.left - PAD}px`,
            top: `${box.top - PAD}px`,
            width: `${box.width + PAD * 2}px`,
            height: `${box.height + PAD * 2}px`,
          }"
        />
      </Transition>
    </Teleport>
    <!-- reading lines can be moved along by clicking anywhere -->
    <div
      v-if="onPage && clickAnywhere"
      class="fixed inset-0 z-56 cursor-pointer"
      @click="dialogue?.advance()"
    />
    <div
      class="pointer-events-none fixed inset-x-0 z-60 flex justify-center px-3"
      :class="
        (current?.position ?? config.position) === 'top'
          ? 'top-40'
          : 'bottom-20 md:bottom-6'
      "
    >
      <GuideDialogue
        v-if="onPage"
        ref="dialogue"
        class="pointer-events-auto"
        :speaker="config.speaker"
        :text="current?.text ?? ''"
        :vars="vars"
        :has-more="!isLast && !current?.interact"
        @next="line++"
      >
        <UiButtonSmall
          v-if="current?.skip"
          icon="lucide:skip-forward"
          @click="guide.go(current.skip)"
        >
          skip
        </UiButtonSmall>
        <UiButtonSmall
          v-if="isLast && config.action"
          icon="lucide:check"
          @click="act"
        >
          {{ config.action }}
        </UiButtonSmall>
      </GuideDialogue>
      <GuideDialogue
        v-else
        class="pointer-events-auto"
        :speaker="config.speaker"
        text="let's pick up where we left off!"
      >
        <UiButtonSmall icon="lucide:arrow-right" :to="guide.path.value!">
          take me there
        </UiButtonSmall>
      </GuideDialogue>
    </div>
  </template>
</template>

<script setup lang="ts">
// Space between the highlighted thing and the border around it
const PAD = 14;

const route = useRoute();
const guide = useGuide();
const { step, config } = guide;

// Which line of the step's dialogue they're on
const line = ref(0);
// Whether they had no pixels to draw with when they got to the canvas, decided once so
// spending their last pixel doesn't change what the guide says
const { pixels, loaded: pixelsLoaded } = usePixels();
const noPixels = ref<boolean | null>(null);
watchEffect(() => {
  if (step.value !== "paint") noPixels.value = null;
  else if (noPixels.value === null && pixelsLoaded.value) {
    noPixels.value = pixels.value === 0;
  }
});

const current = computed(() => {
  const l = config.value?.lines[line.value];
  return l?.ifNoPixels && noPixels.value ? { ...l, ...l.ifNoPixels } : l;
});

// What "<display name>" and "<project name>" in a line are swapped for. The project page
// sets the project name while it's open.
const displayName = useDisplayName();
const projectName = useState<string | null>("guide-project-name", () => null);
const vars = computed(() => ({
  "display name": displayName.value,
  "project name": projectName.value ?? "your project",
}));
const dialogue = ref<{ advance: () => void }>();
const isLast = computed(
  () => !config.value || line.value >= config.value.lines.length - 1,
);
watch(step, () => (line.value = 0));

// Lines that are only there to be read, as opposed to ones that wait for the player to do
// something with what's highlighted
const clickAnywhere = computed(() => !isLast.value && !current.value?.interact);

// Lines waiting on something happening on the canvas move on by themselves
watch(guide.signaled, (name) => {
  if (name && current.value?.waitFor === name && !isLast.value) line.value++;
  else if (name && current.value?.backOn === name && line.value > 0)
    line.value--;
  guide.signaled.value = null;
});

// Walking to the canvas is what moves them from finalizing to painting
watch(
  () => route.path,
  (path) => {
    if (step.value === "finalize" && path === "/app/canvas") guide.go("paint");
  },
  { immediate: true },
);

// Steps with a page of their own wait for them to come back if they wander off. Painting
// falls back to pointing at the canvas link, like finalizing.
const onPage = computed(
  () => !guide.path.value || route.path === guide.path.value,
);

function act() {
  if (step.value === "shop") guide.go("home");
  else if (step.value === "home") guide.finish();
}

// Finds what to highlight, which may load in late or be one of two nav links (desktop and
// phone), only one of which is on screen
interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  // Inside something fixed to the screen (the phone nav), so it's placed on the screen
  // instead of on the page
  fixed: boolean;
}
const box = ref<Box | null>(null);
// Only slides when moving from one thing to the next with both on screen. Anything else
// (scrolling, resizing, a target off screen) moves straight there, or it lags behind.
const sliding = ref(false);
let slideTimer: ReturnType<typeof setTimeout> | undefined;

let target: Element | undefined;
let targetRect: DOMRect | undefined;
let targetFixed = false;

function onScreen(r: DOMRect) {
  return (
    r.bottom > 0 &&
    r.top < window.innerHeight &&
    r.right > 0 &&
    r.left < window.innerWidth
  );
}

function insideFixed(el: Element) {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (getComputedStyle(node).position === "fixed") return true;
  }
  return false;
}

function measure() {
  const selector = onPage.value ? current.value?.highlight : undefined;
  const next = selector
    ? [...document.querySelectorAll(selector)].find(
        (el) => el.getBoundingClientRect().width,
      )
    : undefined;
  if (!next) {
    target = targetRect = undefined;
    box.value = null;
    return;
  }

  const r = next.getBoundingClientRect();
  if (next !== target) {
    const slide = !!(targetRect && onScreen(targetRect) && onScreen(r));
    clearTimeout(slideTimer);
    sliding.value = slide;
    if (slide) slideTimer = setTimeout(() => (sliding.value = false), 500);
    else if (!onScreen(r))
      next.scrollIntoView({ block: "center", behavior: "smooth" });
    target = next;
    targetFixed = insideFixed(next);
  }
  targetRect = r;

  const left = r.left + (targetFixed ? 0 : window.scrollX);
  const top = r.top + (targetFixed ? 0 : window.scrollY);
  const b = box.value;
  if (
    !b ||
    b.left !== left ||
    b.top !== top ||
    b.width !== r.width ||
    b.height !== r.height ||
    b.fixed !== targetFixed
  ) {
    box.value = {
      left,
      top,
      width: r.width,
      height: r.height,
      fixed: targetFixed,
    };
  }
}

// Every frame, so it keeps up with things moving around (the page being laid out,
// the canvas's buttons appearing)
let frame = 0;
function loop() {
  measure();
  frame = requestAnimationFrame(loop);
}
onMounted(loop);
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  clearTimeout(slideTimer);
});
</script>

<style scoped>
/* slides from one target to the next, and fades in and out as the highlight comes and goes */
.guide-slide {
  transition:
    left 0.5s ease-in-out,
    top 0.5s ease-in-out,
    width 0.5s ease-in-out,
    height 0.5s ease-in-out;
}
.guide-fade-enter-active,
.guide-fade-leave-active {
  transition: opacity 0.3s ease;
}
@media (prefers-reduced-motion: reduce) {
  .guide-slide,
  .guide-fade-enter-active,
  .guide-fade-leave-active {
    transition: none;
  }
}
.guide-fade-enter-from,
.guide-fade-leave-to {
  opacity: 0;
}

.guide-spotlight {
  box-shadow: 0 0 0 300vmax rgb(0 0 0 / 0.6);
}

/* a black outline that grows and shrinks, for things on a white background */
.guide-pulse {
  animation: guide-pulse 1s ease-in-out infinite;
}
@keyframes guide-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}
@media (prefers-reduced-motion: reduce) {
  .guide-pulse {
    animation: none;
  }
}
</style>
