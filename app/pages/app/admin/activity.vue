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
        <h1 class="mt-2 font-bold text-3xl">activity</h1>
        <p class="mt-1 opacity-70">
          Users who made a request, by UTC day and hour
        </p>
      </UiCard>

      <div class="flex flex-wrap items-end gap-4">
        <label class="block">
          <span class="block text-sm opacity-70">from</span>
          <input v-model="from" type="date" :max="to" class="border-4 border-black px-2 py-1" />
        </label>
        <label class="block">
          <span class="block text-sm opacity-70">to</span>
          <input v-model="to" type="date" :min="from" class="border-4 border-black px-2 py-1" />
        </label>
      </div>

      <p v-if="error" class="font-bold">{{ error.statusMessage || "Couldn't load activity" }}</p>

      <template v-else-if="data">
        <div class="border-4 border-black p-5">
          <p class="opacity-70">total users</p>
          <p class="font-bold text-3xl">{{ data.totalUsers }}</p>
        </div>

        <div class="border-4 border-black p-5">
          <h2 class="font-bold text-xl mb-3">daily active users</h2>
          <AdminBarChart :points="data.daily" />
        </div>

        <div class="border-4 border-black p-5">
          <h2 class="font-bold text-xl mb-3">hourly active users</h2>
          <AdminBarChart :points="data.hourly" hourly />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const day = (d: Date) => d.toISOString().slice(0, 10);
const now = new Date();
const to = ref(day(now));
const from = ref(day(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)));

const { data, error } = await useFetch("/api/admin/activity", {
  query: { from, to },
});
</script>
