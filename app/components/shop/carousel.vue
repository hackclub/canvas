<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <h2 class="font-bold text-xl">in the shop</h2>
      <div v-if="items.length" class="flex gap-2">
        <UiButtonSmall
          icon="lucide:arrow-left"
          aria-label="Previous items"
          @click="scroll(-1)"
        />
        <UiButtonSmall
          icon="lucide:arrow-right"
          aria-label="Next items"
          @click="scroll(1)"
        />
      </div>
    </div>

    <div
      v-if="items.length"
      ref="track"
      class="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2"
    >
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        to="/app/shop"
        class="no-underline! snap-start shrink-0 w-72 max-w-[85%] flex flex-col border-4 border-black hover:bg-black hover:text-white transition-colors"
      >
        <img
          :src="
            item.bannerKey
              ? `/images/${item.bannerKey}`
              : '/img/placeholder-img.svg'
          "
          alt=""
          loading="lazy"
          class="h-36 w-full object-cover"
          :class="item.bannerKey ? 'object-center' : 'object-bottom'"
        />
        <div class="flex flex-col flex-1 p-4 border-t-4 border-black">
          <h3 class="font-bold text-lg line-clamp-1">{{ item.name }}</h3>
          <p class="text-sm opacity-60">{{ stockLabel(item.stock) }}</p>
          <p class="mt-1 mb-4 opacity-70 line-clamp-3">
            {{ item.description }}
          </p>
          <p class="mt-auto font-bold">
            {{ item.price.toLocaleString() }} bonus points
          </p>
        </div>
      </NuxtLink>
    </div>
    <p v-else class="opacity-60 italic">
      Nothing in the shop yet, check back soon!
    </p>
  </div>
</template>

<script setup lang="ts">
// The items admins picked for the app home page
const { data: shop } = await useFetch("/api/shop");
const items = computed(() => shop.value?.items.filter((i) => i.showInApp) ?? []);

const track = ref<HTMLElement>();

// moves about one screenful, snapping to the nearest card
function scroll(direction: 1 | -1) {
  const el = track.value;
  if (!el) return;
  el.scrollBy({ left: direction * el.clientWidth * 0.8 });
}
</script>
