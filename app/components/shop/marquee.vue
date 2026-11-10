<template>
  <div class="-rotate-5">
    <div class="flex justify-end mb-4 me-10">
      <SvgArrowsYoucouldgetthis :width="350" />
    </div>
    <UiMarquee v-if="looped.length" :speed="40" class="scale-105">
      <div
        v-for="(item, i) in looped"
        :key="i"
        class="shrink-0 w-64 mr-4 flex flex-col border-4 border-black bg-white hover:bg-black hover:text-white transition-colors"
      >
        <img
          :src="
            item.bannerKey
              ? `/images/${item.bannerKey}`
              : '/img/placeholder-img.svg'
          "
          alt=""
          draggable="false"
          class="h-32 w-full object-cover"
          :class="item.bannerKey ? 'object-center' : 'object-bottom'"
        />
        <div class="flex flex-col flex-1 p-3 border-t-4 border-black">
          <h3 class="font-bold line-clamp-1">{{ item.name }}</h3>
        </div>
      </div>
    </UiMarquee>
  </div>
</template>

<script setup lang="ts">
import featured from "~/data/shop-featured.json";

// The shop items admins picked for the landing page, as they were when the site went static
const items = ref(featured);

// The marquee loops by repeating its contents, which only looks seamless if one copy is wider
// than the screen. So a short list is repeated until it's at least ~2400px (cards are 272px).
const looped = computed(() => {
  const list = items.value ?? [];
  if (!list.length) return [];
  const copies = Math.ceil(2400 / (272 * list.length));
  return Array.from({ length: copies }, () => list).flat();
});
</script>
