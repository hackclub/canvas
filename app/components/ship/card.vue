<template>
  <article class="flex flex-col border-4 border-black bg-white">
    <img
      :src="
        ship.bannerKey ? `/images/${ship.bannerKey}` : '/img/placeholder-img.svg'
      "
      alt=""
      loading="lazy"
      class="h-44 w-full object-cover"
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
          {{ owner }}
        </NuxtLink>
        <template v-else>{{ owner }}</template>
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
</template>

<script setup lang="ts">
// One approved project, with what the old dashboard's "recently shipped" carousel showed
export interface Ship {
  id: number;
  name: string;
  description: string | null;
  bannerKey: string | null;
  demoUrl: string | null;
  repoUrl: string | null;
  ownerName: string | null;
  ownerSlackId: string | null;
}

const props = defineProps<{ ship: Ship }>();

const owner = computed(() =>
  props.ship.ownerName ? `@${props.ship.ownerName}` : "a Hack Clubber",
);
</script>
