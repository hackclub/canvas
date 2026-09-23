<template>
  <div class="flex flex-col items-start gap-4 p-8">
    <pre class="border-4 border-black p-4">{{ user }}</pre>
    <UiButton icon="lucide:log-out" @click="logout">log out</UiButton>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
});

const { user, clear } = useUserSession();

async function logout() {
  await clear();
  await navigateTo("/");
}
</script>
