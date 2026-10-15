<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-150 px-4 md:px-8 py-12 space-y-4">
      <UiCard>
        <h1 class="font-bold text-3xl">unsubscribed :c</h1>
        <p class="mt-3">
          you won't get messages sent to everyone on Canvas anymore. you'll
          still hear about your own ships!
        </p>
      </UiCard>
      <p>
        changed your mind? you can subscribe again on your
        <NuxtLink to="/app/me">account page</NuxtLink>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "blank",
});
</script>
