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
          Logins, and people who coded, by UTC day and hour
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

      <template v-else-if="data && stats">
        <!-- right now, whatever dates are picked -->
        <dl class="grid gap-4 sm:grid-cols-3">
          <div
            v-for="c in current"
            :key="c.label"
            class="border-4 border-black p-4"
          >
            <dt class="opacity-70">{{ c.label }}</dt>
            <dd class="font-bold text-2xl">{{ c.value }}</dd>
          </div>
        </dl>

        <div class="border-4 border-black p-5">
          <h2 class="font-bold text-xl">daily active users</h2>
          <p class="text-sm opacity-70 mb-3">
            People who coded at least 15 minutes on their linked Hackatime
            projects that day. Counted when they open Canvas, so it only has
            days since this was added, and a day's time lands on the day we
            noticed it.
          </p>
          <AdminBarChart :points="asValues(data.dailyActive)" />
        </div>

        <div class="border-4 border-black p-5">
          <h2 class="font-bold text-xl">daily active logins</h2>
          <p class="text-sm opacity-70 mb-3">
            People who made any request that day.
          </p>
          <AdminBarChart :points="asValues(data.daily)" />
        </div>

        <div class="border-4 border-black p-5">
          <h2 class="font-bold text-xl">hourly active logins</h2>
          <p class="text-sm opacity-70 mb-3">
            People who made any request that hour.
          </p>
          <AdminBarChart :points="asValues(data.hourly)" hourly />
        </div>

        <p class="text-sm opacity-70">
          The rest are totals at the end of each day (today's is so far).
        </p>

        <div
          v-for="c in charts"
          :key="c.title"
          class="border-4 border-black p-5"
        >
          <h2 class="font-bold text-xl">{{ c.title }}</h2>
          <p class="text-sm opacity-70 mb-3">{{ c.note }}</p>
          <AdminBarChart :points="stats[c.key]" :unit="c.unit" />
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
const { data: stats } = await useFetch("/api/admin/stats", {
  query: { from, to },
});

const asValues = (points: { at: string; users: number }[]) =>
  points.map((p) => ({ at: p.at, value: p.users }));

const n = (v: number) => v.toLocaleString();
const current = computed(() => {
  const c = stats.value?.current;
  if (!c) return [];
  return [
    { label: "total users", value: n(c.users) },
    { label: "total projects", value: n(c.projects) },
    { label: "unshipped hours", value: n(c.unshippedHours) },
    { label: "shipped hours", value: n(c.shippedHours) },
    { label: "pixels in circulation", value: n(c.pixels) },
    { label: "bonus points in circulation", value: n(c.bonusPoints) },
  ];
});

const charts = [
  { key: "users", title: "total users", note: "By when they first signed in.", unit: "" },
  { key: "projects", title: "total projects", note: "Projects that still exist.", unit: "" },
  {
    key: "unshippedHours",
    title: "unshipped hours",
    note: "Hours on linked Hackatime projects that haven't been shipped and paid. Only saved from when this was added, and as fresh as people's last visit.",
    unit: "h",
  },
  {
    key: "shippedHours",
    title: "shipped hours",
    note: "Hours paid for by approved ships, counted when they were approved.",
    unit: "h",
  },
  {
    key: "pixels",
    title: "pixels in circulation",
    note: "Pixels people are holding: earned minus spent on the canvas.",
    unit: "",
  },
  {
    key: "bonusPoints",
    title: "bonus points in circulation",
    note: "Bonus points people are holding.",
    unit: "",
  },
] as const;
</script>
