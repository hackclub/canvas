<template>
  <div class="space-y-2 p-6">
    <h1 class="text-2xl font-bold">all done</h1>
    <p class="mb-3">
      Everything's ready. Press the button below to enter Canvas.
    </p>
    <UiButtonSmall to="/app" icon="lucide:arrow-right"
      >let me in!!</UiButtonSmall
    >
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "setup",
});
</script>
