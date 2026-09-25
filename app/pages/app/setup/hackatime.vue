<template>
  <div class="space-y-2 p-6">
    <h1 class="text-2xl font-bold">hackatime!</h1>
    <p class="mb-3">
      Hackatime keeps track of how much time you spend coding. Let's link your
      Hackatime account!
    </p>
    <UiButtonSmall
      v-if="hackatime?.linked"
      to="/app/setup/finish"
      external
      icon="lucide:arrow-right"
      >next</UiButtonSmall
    >
    <UiButtonSmall
      v-else
      to="/auth/hackatime"
      external
      icon="lucide:arrow-right"
      >link hackatime</UiButtonSmall
    >
    <p v-if="hackatime?.linked" class="opacity-60 italic">
      You've already linked Hackatime. If you're having any issues, you can also
      <NuxtLink to="/auth/hackatime">reconnect it</NuxtLink>.
    </p>
    <p v-else class="opacity-60 italic">
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

const { data: hackatime } = await useFetch("/api/hackatime");
</script>
