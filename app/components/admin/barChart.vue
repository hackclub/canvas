<template>
  <div>
    <div class="flex items-end gap-px h-40 border-b-4 border-black">
      <div
        v-for="p in points"
        :key="p.at"
        class="flex-1 bg-black min-w-px"
        :style="{ height: `${max ? (p.users / max) * 100 : 0}%` }"
        :title="`${label(p.at)}: ${p.users}`"
      />
    </div>
    <div class="mt-1 flex justify-between text-sm opacity-70">
      <span>{{ points[0] ? label(points[0].at) : "" }}</span>
      <span>peak {{ max }}</span>
      <span>{{ points.length ? label(points[points.length - 1]!.at) : "" }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  points: { at: string; users: number }[];
  hourly?: boolean;
}>();

const max = computed(() => Math.max(0, ...props.points.map((p) => p.users)));

const label = (at: string) =>
  new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(props.hourly ? { hour: "numeric" } : {}),
    timeZone: "UTC",
  }) + (props.hourly ? " UTC" : "");
</script>
