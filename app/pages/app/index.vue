<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-8 py-3 space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          to="/app/canvas"
          class="group/button min-h-40 no-underline! block bg-black text-white transition-colors"
        >
          <div class="pixels flex flex-col p-5 w-full h-full">
            <h2 class="flex items-center gap-2 font-bold text-xl">
              <Icon name="lucide:paintbrush" /> canvas
            </h2>
            <p class="mt-1 mb-6 opacity-70">
              Draw on the shared canvas, the end result gets put up at HQ!
            </p>
            <UiButtonSmall
              class="border-white mt-auto self-start"
              icon="lucide:arrow-right"
              group-hover
            >
              open the canvas
            </UiButtonSmall>
          </div>
        </NuxtLink>
        <NuxtLink
          to="/app/shop"
          class="group/button no-underline! block bg-black text-white transition-colors"
        >
          <div class="gift flex flex-col p-5 w-full h-full">
            <h2 class="flex items-center gap-2 font-bold text-xl">
              <Icon name="lucide:shopping-bag" /> shop
            </h2>
            <p class="mt-1 mb-6 opacity-70">
              Ship projects to get bonus points, get loot in the shop.
            </p>
            <UiButtonSmall
              class="border-white mt-auto self-start"
              icon="lucide:arrow-right"
              group-hover
            >
              get loot
            </UiButtonSmall>
          </div>
        </NuxtLink>
      </div>

      <div class="space-y-2">
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
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});

const { user } = useUserSession();
const { data: projects } = await useFetch("/api/projects");
const { data: hackatime } = await useFetch("/api/hackatime");

// Drawing and shipping have no API to check yet, so they always show as not done
const todos = computed(() => [
  { label: "link hackatime", done: !!hackatime.value?.linked },
  { label: "create your first project", done: !!projects.value?.length },
  { label: "draw on the canvas", done: false },
  { label: "ship your first project", done: false },
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
