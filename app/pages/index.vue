<template>
  <div class="relative min-h-screen bg-white overflow-x-hidden">
    <nav class="fixed inset-x-0 top-0 z-20 px-4">
      <div class="flex justify-between items-start">
        <SvgHackOrphtop :width="150" />
        <div class="pt-4">
          <button
            class="flex items-center ease-in-out duration-200 gap-1 p-3 bg-black transition-colors border-black border-4 hover:bg-white hover:text-black text-white font-bold"
          >
            <span>start painting</span>
            <Icon name="lucide:arrow-right" :size="22" />
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
        <SvgWordmark class="w-full max-w-75" />
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
