<template>
  <div class="space-y-2 p-6">
    <h1 class="text-2xl font-bold">hackatime!</h1>
    <p class="mb-3">
      Hackatime keeps track of how much time you spend coding. Let's link your
      Hackatime account!
    </p>
    <UiButtonSmall to="" icon="lucide:arrow-right"
      >link hackatime</UiButtonSmall
    >
    <p class="opacity-60 italic">
      First time participating in a Hack Club program? Learn more about what
      Hackatime is and how to set it up on the
      <NuxtLink to="https://hackatime.hackclub.com">Hackatime website</NuxtLink
      >.
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "setup",
});
</script>
