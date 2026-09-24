<template>
  <div class="space-y-2 p-6">
    <h1 class="text-2xl font-bold">
      Hi {{ user?.first_name }}, welcome to Canvas!
    </h1>
    <p>
      One large canvas. Build projects to place pixels. Work together to make
      something awesome. <b>The final result gets put up at Hack Club HQ!</b>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "setup",
});

const { user } = useUserSession();
</script>
