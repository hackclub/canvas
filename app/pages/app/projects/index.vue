<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-8 py-3">
      <UiCard>
        <h1 class="font-bold text-3xl">projects</h1>
        <p class="mt-3">build projects, get pixels, draw on the canvas!</p>
        <div class="absolute top-8 right-8">
          <UiButtonSmall class="border-3 border-white">
            create new project
          </UiButtonSmall>
        </div>
      </UiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});
</script>
