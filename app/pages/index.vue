<template>
  <div class="relative min-h-screen bg-white overflow-x-hidden">
    <nav class="fixed inset-x-0 top-0 z-20 px-4">
      <div class="flex justify-between items-start">
        <SvgHackOrphtop :width="150" />
        <div class="pt-4">
          <button
            class="group relative overflow-hidden border-black border-4 bg-black px-3 py-3 font-bold text-white"
          >
            <span
              class="absolute inset-0 bg-white translate-y-full transition-transform duration-200 ease-in-out group-hover:translate-y-0"
            />
            <span
              class="relative z-10 flex items-center gap-1 transition-colors duration-200 ease-in-out group-hover:text-black"
            >
              <span>Start painting</span>
              <Icon name="lucide:arrow-right" :size="22" />
            </span>
          </button>
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
      </div>
    </section>

    <section class="relative -mt-50 z-10">
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
