<template>
  <div
    v-if="total > pageSize"
    class="flex items-center justify-between gap-4"
  >
    <UiButtonSmall
      icon="lucide:arrow-left"
      icon-position="left"
      :disabled="page <= 1"
      :class="page <= 1 ? 'opacity-50 pointer-events-none' : ''"
      @click="page--"
    >
      newer
    </UiButtonSmall>
    <p class="text-sm opacity-70">page {{ page }} of {{ pages }}</p>
    <UiButtonSmall
      icon="lucide:arrow-right"
      :disabled="page >= pages"
      :class="page >= pages ? 'opacity-50 pointer-events-none' : ''"
      @click="page++"
    >
      older
    </UiButtonSmall>
  </div>
</template>

<script setup lang="ts">
const page = defineModel<number>({ required: true });
const props = defineProps<{ total: number; pageSize: number }>();

const pages = computed(() =>
  Math.max(1, Math.ceil(props.total / props.pageSize)),
);
</script>
