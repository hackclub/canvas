<template>
  <div class="space-y-2 p-6">
    <h1 class="text-2xl font-bold">How does Canvas work?</h1>
    <p class="mb-3">
      You get pixels for building personal projects. You use these to draw on a
      shared canvas. The final result gets printed and put up at HQ.
    </p>
    <UiButtonSmall to="/app/setup/hackatime" icon="lucide:arrow-right"
      >ok, got it</UiButtonSmall
    >
  </div>
  <div class="grid grid-cols-3 gap-1 bg-black border-black border-t-4">
    <div class="p-2 bg-white space-y-1">
      <div class="flex gap-1.5 items-center">
        <Icon name="lucide:hammer" :size="24" />
        <h2 class="text-xl font-bold">Build</h2>
      </div>
      <p>Build a personal project</p>
    </div>
    <div class="p-2 bg-white space-y-1">
      <div class="flex gap-1.5 items-center">
        <Icon name="lucide:brush" :size="24" />
        <h2 class="text-xl font-bold">Paint</h2>
      </div>
      <p>Earn pixels and draw on the canvas</p>
    </div>
    <div class="p-2 bg-white space-y-1">
      <div class="flex gap-1.5 items-center">
        <Icon name="lucide:repeat" :size="24" />
        <h2 class="text-xl font-bold">Repeat</h2>
      </div>
      <p>Get bonuses and streaks for extra pixels!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "setup",
});
</script>
