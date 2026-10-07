<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/admin"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> admin
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">funnel</h1>
        <p class="mt-1 opacity-70">
          How many people have made it to each step. Steps aren't required to
          be done in order, so a step can be higher than the one before it.
        </p>
      </UiCard>

      <div class="border-4 border-black divide-y-2 divide-black">
        <div v-for="step in data?.steps" :key="step.key" class="px-4 py-3">
          <div class="flex justify-between gap-4">
            <span class="font-semibold">{{ step.label }}</span>
            <span>
              <b>{{ step.users.toLocaleString() }}</b>
              <span class="opacity-60">
                · {{ percent(step.users) }}%
              </span>
            </span>
          </div>
          <div class="mt-2 h-4 border-2 border-black">
            <div class="h-full bg-black" :style="{ width: `${percent(step.users)}%` }" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const { data } = await useFetch("/api/admin/funnel");

const total = computed(() => data.value?.steps[0]?.users ?? 0);
const percent = (n: number) =>
  total.value ? Math.min(100, Math.round((n / total.value) * 100)) : 0;
</script>
