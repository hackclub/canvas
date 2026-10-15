<template>
  <div class="flex justify-center w-full">
    <div class="w-full px-4 md:px-8">
      <!-- the screen minus the nav (and the double pixels banner, if it's showing) -->
      <div class="h-[calc(100dvh-10.5rem-var(--banner-height,0px))] md:h-[calc(100dvh-6.5rem-var(--banner-height,0px))] min-h-96 border-4 border-black">
        <ClientOnly>
          <CanvasBoard />
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});
</script>
