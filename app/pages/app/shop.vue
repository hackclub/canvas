<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-8 py-3 space-y-4">
      <UiCard>
        <h1 class="font-bold text-3xl">shop</h1>
        <p class="mt-3">trade your pixels for prizes!</p>
      </UiCard>

      <p class="opacity-60 italic">The shop isn't open yet, check back soon!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});
</script>
