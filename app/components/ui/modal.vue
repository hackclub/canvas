<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-2"
      @click.self="open = false"
    >
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="title || undefined"
        class="border-4 border-black bg-white p-6 space-y-3"
        :style="{ width: `${width}px`, maxWidth: '100%' }"
      >
        <h2 v-if="title" class="text-2xl font-bold">{{ title }}</h2>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ default: false });

defineProps({
  title: {
    type: String,
    default: "",
  },
  width: {
    type: Number,
    default: 450,
  },
});

// closes on Escape wherever focus is, not just inside the modal
function onKeydown(event: KeyboardEvent) {
  if (open.value && event.key === "Escape") open.value = false;
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>
