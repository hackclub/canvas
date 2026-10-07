<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="card in cards"
          :key="card.to"
          :to="card.to"
          class="group/button min-h-40 no-underline! block bg-black text-white transition-colors"
        >
          <div class="flex flex-col p-5 w-full h-full" :class="card.bg">
            <h2 class="flex items-center gap-2 font-bold text-xl">
              <Icon :name="card.icon" /> {{ card.title }}
            </h2>
            <p class="mt-1 mb-6 opacity-70">
              {{ card.description }}
            </p>
            <UiButtonSmall
              class="border-white mt-auto self-start"
              icon="lucide:arrow-right"
              group-hover
            >
              {{ card.cta }}
            </UiButtonSmall>
          </div>
        </NuxtLink>
      </div>

      <div v-if="coding" class="border-4 border-black p-5">
        <h2 class="font-bold text-xl">hours coded</h2>
        <p class="mt-1 opacity-70">
          Earn {{ coding.pixelsPerHour }} pixels for every hour you code,
          {{ coding.hoursPaid }} hour{{ coding.hoursPaid === 1 ? "" : "s" }} paid so far.
        </p>
        <div class="mt-3 h-4 border-4 border-black">
          <div
            class="h-full bg-black"
            :style="{ width: `${(coding.secondsIntoHour / 3600) * 100}%` }"
          />
        </div>
        <p class="mt-1 text-sm opacity-70">
          {{ Math.floor(coding.secondsIntoHour / 60) }} / 60 minutes until your next
          {{ coding.pixelsPerHour }} pixels
        </p>
      </div>

      <ShipCarousel />

      <div>
        <div class="space-y-2 p-5 border-4 border-b-0 border-black">
          <h2 class="font-bold text-xl">to-do</h2>
          <ul class="space-y-2">
            <li
              v-for="todo in todos"
              :key="todo.label"
              class="flex items-center gap-2"
            >
              <Icon
                :name="todo.done ? 'lucide:square-check' : 'lucide:square'"
                size="22"
              />
              <span
                class="font-semibold"
                :class="todo.done ? 'line-through opacity-60' : ''"
              >
                {{ todo.label }}
              </span>
            </li>
          </ul>
        </div>
        <div class="p-5 py-3 bg-black text-white">
          <span>complete all items for 25 pixels!</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});

const cards = [
  {
    to: "/app/canvas",
    icon: "lucide:paintbrush",
    title: "canvas",
    description: "Draw on the shared canvas, the end result gets put up at HQ!",
    cta: "open the canvas",
    bg: "pixels",
  },
  {
    to: "/app/shop",
    icon: "lucide:shopping-bag",
    title: "shop",
    description: "Ship projects to get bonus points, get loot in the shop.",
    cta: "get loot",
    bg: "gift",
  },
];

const { user } = useUserSession();
const { data: projects } = await useFetch("/api/projects");
const { data: hackatime } = await useFetch("/api/hackatime");
const { data: progress } = await useFetch("/api/me/progress");

// Pays for any newly coded hours, so it runs in the browser and updates the balance
const { refreshPixels } = usePixels();
const { data: coding } = useFetch("/api/me/coding", {
  method: "POST",
  server: false,
  onResponse: ({ response }) => {
    if (response._data?.awarded) refreshPixels();
  },
});

// The shop has no API to check yet, so it always shows as not done
const todos = computed(() => [
  { label: "link hackatime", done: !!hackatime.value?.linked },
  { label: "create your first project", done: !!projects.value?.length },
  { label: "draw on the canvas", done: !!progress.value?.drawn },
  { label: "ship your first project", done: !!progress.value?.shipped },
  { label: "get some loot from the shop", done: false },
]);
</script>

<style scoped>
.pixels {
  background: url("/img/canvas-pixels.svg") no-repeat;
  background-position: bottom right;
  background-size: 100px;
}

.gift {
  background: url("/img/gift.svg") no-repeat;
  background-position: bottom right;
  background-size: 100px;
}
</style>
