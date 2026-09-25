<template>
  <div class="flex justify-center">
    <nav class="relative flex justify-between items-center max-w-full w-250">
      <div class="px-8 py-6">
        <SvgLogoCompact :width="60" />
      </div>
      <div class="absolute left-1/2 -translate-x-1/2">
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
            -
            :to="link.to"
            :data-active="link.active"
            :data-hovered="hovered == link.to"
            @mouseenter="hovered = link.to"
            class="relative no-underline! text-lg px-3 py-1 transition-[transform,color] duration-300"
            >{{ link.label }}</NuxtLink
          >
        </div>
      </div>
      <div class="px-8">
        <div
          class="text-lg font-semibold bg-black px-2 pe-3 py-1 text-white flex items-center gap-1"
        >
          <Icon name="lucide:paintbrush" :size="24" mode="svg" />
          <span class="">0</span>
        </div>
      </div>
    </nav>
  </div>
  <div>
    <slot />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { user } = useUserSession();

const links = computed(() => [
  { to: "/app", label: "Canvas", active: route.path == "/app" },
  {
    to: "/app/projects",
    label: "Projects",
    active: route.path.startsWith("/app/projects"),
  },
  {
    to: "/app/me",
    label: user.value?.first_name,
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
</script>
