<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-8 py-3 space-y-4">
      <UiCard>
        <h1 class="font-bold text-3xl">account</h1>
        <p class="mt-3">
          this is where you can change your account settings :o
        </p>
        <div class="absolute top-8 right-8">
          <UiButtonSmall class="border-3 border-white" @click="logout">
            sign out
          </UiButtonSmall>
        </div>
      </UiCard>

      <div class="space-y-2">
        <h2 class="font-bold text-xl">hackatime</h2>
        <UiButtonSmall to="/auth/hackatime?return_to=/app/me" external>
          {{ hackatime?.linked ? "reauthenticate" : "link" }} hackatime
        </UiButtonSmall>
        <p class="text-sm opacity-70">
          {{
            hackatime?.linked
              ? "Your Hackatime account is linked. If your coding time isn't showing up, try reauthenticating."
              : "You haven't linked a Hackatime account yet."
          }}
        </p>
      </div>

      <div class="space-y-2">
        <h2 class="font-bold text-xl">accessibility</h2>
        <UiButtonSmall @click="toggleReduceMotion">
          {{ reduceMotion ? "enable" : "disable" }} background animation
        </UiButtonSmall>
        <p class="text-sm opacity-70">
          Background animations are always off if reduce motion is turned on in
          your device's settings. This doesn't toggle all animation, only ones
          where you might get motion sick (like the setup screen!).
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});

const { clear } = useUserSession();
const { reduceMotion, toggleReduceMotion } = useReduceMotion();
const { data: hackatime } = await useFetch("/api/hackatime");

async function logout() {
  await clear();
  await navigateTo("/");
}
</script>
