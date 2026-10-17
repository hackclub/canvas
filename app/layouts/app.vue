<template>
  <!-- client only: the weekday is in the browser's timezone, which the server doesn't know -->
  <ClientOnly>
    <div
      v-if="boost"
      ref="bannerEl"
      class="bg-black text-white px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center"
    >
      <p>
        <b>ship before the end of {{ boostWeekday }}</b> and your pixel payout gets
        doubled (up to {{ boost.maxExtra }} extra pixels)!
      </p>
      <NuxtLink
        v-if="boost.projectId"
        :to="`/app/projects/${boost.projectId}`"
        class="font-bold text-white!"
      >
        LOCK IN!!
      </NuxtLink>
    </div>
  </ClientOnly>
  <div class="flex justify-center">
    <nav
      class="relative flex justify-between items-center max-w-full transition-[width] duration-500 ease-in-out"
      :class="fullWidth ? 'w-full' : 'w-250'"
    >
      <div class="flex items-center">
        <div class="px-4 py-4 md:px-8 md:py-6">
          <SvgLogoCompact :width="60" />
        </div>
        <div class="hidden md:block">
          <div
            ref="linksEl"
            class="relative flex gap-2"
            @mouseleave="hovered = null"
          >
            <div
              class="z-10 absolute top-0 bottom-0 pointer-events-none backdrop-invert"
              :class="animate ? 'transition-all duration-300 ease-out' : ''"
              :style="{
                left: `${indicator.left}px`,
                width: `${indicator.width}px`,
                opacity: indicator.width ? 1 : 0,
              }"
            />
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :data-active="link.active"
              :data-guide="link.to == '/app/canvas' ? 'canvas-link' : undefined"
              :data-hovered="hovered == link.to"
              @mouseenter="hovered = link.to"
              class="relative no-underline! text-lg px-3 py-1 transition-[transform,color] duration-300"
              >{{ link.label }}</NuxtLink
            >
          </div>
        </div>
      </div>
      <div class="px-4 md:px-8">
        <div class="flex shrink-0 items-end gap-2">
          <div class="text-lg font-semibold bg-black text-white flex items-end">
            <NuxtImg src="/img/small-pixels.svg" width="36" />
            <div class="px-2 py-1 flex items-center">
              <span
                >{{ pixels }}<span class="hidden lg:inline"> pixels</span></span
              >
            </div>
          </div>
          <div class="text-lg font-semibold bg-black text-white flex items-end">
            <NuxtImg src="/img/small-points.svg" width="36" />
            <div class="px-2 ps-0 py-1 flex items-center">
              <span
                >{{ bonusPoints
                }}<span class="hidden lg:inline"> bonus</span></span
              >
            </div>
          </div>
        </div>
      </div>
    </nav>
  </div>
  <!-- phones don't have room for the links next to the logo, so they sit along the
       bottom of the screen instead, scrolling sideways if they don't all fit -->
  <nav
    aria-label="Main"
    class="md:hidden fixed bottom-0 inset-x-0 z-40 flex gap-2 overflow-x-auto bg-white border-t-4 border-black px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
  >
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      :data-guide="link.to == '/app/canvas' ? 'canvas-link' : undefined"
      class="no-underline! shrink-0 whitespace-nowrap text-lg px-3 py-1"
      :class="link.active ? 'bg-black text-white' : ''"
      >{{ link.label }}</NuxtLink
    >
  </nav>
  <!-- leaves room at the bottom so the mobile nav doesn't cover the page -->
  <div class="pb-20 md:pb-0">
    <slot />
  </div>
  <AdminBar />
  <ClientOnly><GuideOverlay /></ClientOnly>
</template>

<script setup lang="ts">
const route = useRoute();
const displayName = useDisplayName();
const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}…` : text;
const { pixels, bonusPoints, refreshPixels } = usePixels();

useSeoMeta({
  title: "Canvas",
});

// The double pixels deal from the "you haven't started yet" DM, null unless it's on
const { data: boost, refresh: refreshBoost } = useFetch("/api/me/boost", {
  key: "boost",
});
// The last day it covers, not the midnight it ends at
const boostWeekday = computed(() =>
  boost.value
    ? new Date(new Date(boost.value.until).getTime() - 1).toLocaleDateString("en-US", {
        weekday: "long",
      })
    : "",
);

// Pixels can change without this user doing anything (e.g. an admin gives them some),
// so re-check on each page change. The banner goes away once they've shipped.
watch(
  () => route.path,
  () => {
    refreshPixels();
    refreshBoost();
  },
);

// the canvas gets the whole screen, so the nav stretches out to match it
const fullWidth = computed(() => route.path == "/app/canvas");

const links = computed(() => [
  { to: "/app", label: "Home", active: route.path == "/app" },
  { to: "/app/canvas", label: "Canvas", active: route.path == "/app/canvas" },
  {
    to: "/app/projects",
    label: "Projects",
    active: route.path.startsWith("/app/projects"),
  },
  {
    to: "/app/shop",
    label: "Shop",
    active: route.path.startsWith("/app/shop"),
  },
  {
    to: "/app/me",
    label: `@${truncate(displayName.value, 15)}`,
    active: route.path == "/app/me",
  },
]);

const linksEl = ref<HTMLElement>();
const indicator = reactive({ left: 0, width: 0 });
// skip the slide on first paint so the square doesn't fly in from the left
const animate = ref(false);
// the highlight follows the hovered link, falling back to the active one
const hovered = ref<string | null>(null);

function updateIndicator() {
  const target = linksEl.value?.querySelector<HTMLElement>(
    hovered.value ? '[data-hovered="true"]' : '[data-active="true"]',
  );
  indicator.left = target?.offsetLeft ?? 0;
  indicator.width = target?.offsetWidth ?? 0;
}

watch([links, hovered], () => nextTick(updateIndicator));

let observer: ResizeObserver | undefined;
onMounted(() => {
  updateIndicator();
  requestAnimationFrame(() => (animate.value = true));
  // catches font-bold width changes and the user's name loading in
  observer = new ResizeObserver(updateIndicator);
  linksEl.value?.querySelectorAll("a").forEach((el) => observer!.observe(el));
});
onBeforeUnmount(() => observer?.disconnect());

// Pages that fill the screen (the canvas) take the banner's height off theirs with
// var(--banner-height). It changes when the banner wraps, so it's kept up to date.
const bannerEl = ref<HTMLElement>();
const bannerObserver = import.meta.client
  ? new ResizeObserver(([entry]) =>
      document.documentElement.style.setProperty(
        "--banner-height",
        `${entry?.borderBoxSize[0]?.blockSize ?? 0}px`,
      ),
    )
  : undefined;
watch(bannerEl, (el, old) => {
  if (old) bannerObserver?.unobserve(old);
  if (el) bannerObserver?.observe(el);
  else document.documentElement.style.removeProperty("--banner-height");
});
onBeforeUnmount(() => {
  bannerObserver?.disconnect();
  document.documentElement.style.removeProperty("--banner-height");
});
</script>
