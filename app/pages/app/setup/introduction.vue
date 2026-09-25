<template>
  <div class="space-y-2 p-6">
    <h1 class="text-2xl font-bold">
      hi {{ user?.first_name?.toLowerCase() || "" }}, welcome to canvas!
    </h1>
    <p class="mb-3">
      One large canvas. Build projects to place pixels. Work together to make
      something awesome. <b>The final result gets put up at Hack Club HQ!</b>
    </p>
    <UiButtonSmall to="/app/setup/premise" icon="lucide:arrow-right"
      >let's get started!</UiButtonSmall
    >
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "setup",
});

const { user } = useUserSession();
</script>
