<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <h2 class="font-bold text-xl">recently shipped</h2>
      <div v-if="ships?.length" class="flex gap-2">
        <UiButtonSmall
          icon="lucide:arrow-left"
          aria-label="Previous projects"
          @click="scroll(-1)"
        />
        <UiButtonSmall
          icon="lucide:arrow-right"
          aria-label="Next projects"
          @click="scroll(1)"
        />
      </div>
    </div>

    <div
      v-if="ships?.length"
      ref="track"
      class="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2"
    >
      <article
        v-for="ship in ships"
        :key="ship.id"
        class="snap-start shrink-0 w-72 max-w-[85%] flex flex-col border-4 border-black"
      >
        <img
          :src="
            ship.bannerKey
              ? `/images/${ship.bannerKey}`
              : '/img/placeholder-img.svg'
          "
          alt=""
          loading="lazy"
          class="h-36 w-full object-cover"
          :class="ship.bannerKey ? 'object-center' : 'object-bottom'"
        />
        <div class="flex flex-col flex-1 p-4 border-t-4 border-black">
          <h3 class="font-bold text-lg line-clamp-1">{{ ship.name }}</h3>
          <p class="text-sm opacity-60 line-clamp-1">
            by
            <NuxtLink
              v-if="ship.ownerSlackId"
              :to="slackProfileUrl(ship.ownerSlackId)"
              external
              target="_blank"
            >
              {{ ship.ownerName ? `@${ship.ownerName}` : "a Hack Clubber" }}
            </NuxtLink>
            <template v-else>{{ ship.ownerName ? `@${ship.ownerName}` : "a Hack Clubber" }}</template>
          </p>
          <p class="mt-1 mb-4 opacity-70 line-clamp-3">
            {{ ship.description }}
          </p>
          <div class="mt-auto flex flex-wrap gap-2">
            <UiButtonSmall
              v-if="ship.demoUrl"
              :to="ship.demoUrl"
              external
              target="_blank"
              icon="lucide:external-link"
            >
              demo
            </UiButtonSmall>
            <UiButtonSmall
              v-if="ship.repoUrl"
              :to="ship.repoUrl"
              external
              target="_blank"
              icon="lucide:code"
            >
              source code
            </UiButtonSmall>
          </div>
        </div>
      </article>
    </div>
    <p v-else class="opacity-60 italic">
      Nothing's been shipped yet. Yours could be first!
    </p>
  </div>
</template>

<script setup lang="ts">
const { data: ships } = await useFetch("/api/ships/recent");

const track = ref<HTMLElement>();

// moves about one screenful, snapping to the nearest card
function scroll(direction: 1 | -1) {
  const el = track.value;
  if (!el) return;
  el.scrollBy({ left: direction * el.clientWidth * 0.8 });
}
</script>
