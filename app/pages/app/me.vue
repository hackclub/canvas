<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-8 py-3">
      <UiCard>
        <h1 class="font-bold text-3xl">account</h1>
        <p class="mt-3">
          hii! this is where you can change your account settings.
        </p>
        <div class="absolute top-8 right-8">
          <UiButtonSmall class="border-3 border-white" @click="logout">
            sign out
          </UiButtonSmall>
        </div>
      </UiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});

const { user, clear } = useUserSession();

async function logout() {
  await clear();
  await navigateTo("/");
}
</script>
