<template>
  <div class="relative min-h-screen bg-white overflow-x-hidden">
    <nav class="fixed inset-x-0 top-0 z-20 px-4">
      <div class="flex justify-between items-start">
        <SvgHackOrphtop :width="150" />
        <div class="pt-4">
          <UiButton icon="lucide:arrow-right">Start painting</UiButton>
        </div>
      </div>
    </nav>

    <section
      class="flex min-h-screen justify-center items-center px-4 pt-24 pb-24"
    >
      <div
        class="w-full max-w-150 flex flex-col items-center gap-4 text-center -translate-y-6"
      >
        <SvgWordmark class="w-full max-w-90" />
        <p class="text-xl max-w-150">
          <b>build projects and paint pixels on a shared canvas.</b> the final
          result gets put up at hack club hq!
        </p>

        <div
          class="mt-6 flex items-center border-black border-4 bg-black gap-1"
        >
          <input placeholder="john@example.com" class="p-3 bg-white" />
          <UiButton icon="lucide:arrow-right" inline>let's paint!</UiButton>
        </div>
        <p class="opacity-50">September 28th - October 12th</p>
      </div>
    </section>

    <section class="relative -mt-60 z-10">
      <NuxtImg src="/img/pixelbg.svg" class="w-full" />
      <div class="bg-black h-200 w-full" />
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "blank",
});
</script>
