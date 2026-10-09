<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
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

      <div v-if="referrals" class="border-4 border-black p-5 space-y-3">
        <h2 class="font-bold text-xl">refer a friend</h2>
        <p class="opacity-70">
          Get {{ referrals.pixelsPerReferral }} pixels for every friend who
          signs up with your link and draws on the canvas, for up to
          {{ referrals.cap }} friends.
        </p>
        <div class="flex flex-wrap gap-2">
          <input
            :value="referrals.link"
            readonly
            aria-label="Your referral link"
            class="flex-1 min-w-48 border-3 border-black px-3 py-1 outline-none"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <UiButtonSmall
            :icon="copied ? 'lucide:check' : 'lucide:copy'"
            @click="copyLink"
          >
            {{ copied ? "copied!" : "copy link" }}
          </UiButtonSmall>
        </div>
        <p class="text-sm opacity-70">
          {{ referrals.signedUp }} signed up · {{ referrals.qualified }} /
          {{ referrals.cap }} paid out · {{ referrals.pixelsEarned }} pixels
          earned
        </p>
      </div>

      <div class="space-y-2">
        <h2 class="font-bold text-xl">display name</h2>
        <p class="text-sm opacity-70">
          This is the name other people see, like on your shipped projects.
          {{
            names?.slackDisplayName
              ? `By default it's your Slack display name, "@${names.slackDisplayName}".`
              : "You don't have a Slack display name, so you'll show up as \"a Hack Clubber\" unless you set one here."
          }}
        </p>
        <form class="flex flex-wrap gap-2" @submit.prevent="saveName">
          <input
            v-model="nameInput"
            :maxlength="32"
            :placeholder="names?.slackDisplayName ?? 'Display name'"
            aria-label="Display name"
            class="flex-1 min-w-48 border-3 border-black px-3 py-1 outline-none"
          />
          <UiButtonSmall
            type="submit"
            class="disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="savingName || !nameDirty"
          >
            {{ savingName ? "saving..." : "save" }}
          </UiButtonSmall>
          <UiButtonSmall
            v-if="names?.displayNameOverride"
            class="disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="savingName"
            @click="resetName"
          >
            use Slack name
          </UiButtonSmall>
        </form>
        <p v-if="nameError" class="text-red-600">{{ nameError }}</p>
      </div>

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
const { data: names } = await useFetch("/api/me/display-name", {
  key: "display-name",
});

const { data: referrals } = await useFetch("/api/me/referrals");
const copied = ref(false);
async function copyLink() {
  if (!referrals.value) return;
  await navigator.clipboard.writeText(referrals.value.link);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

const nameInput = ref(names.value?.displayNameOverride ?? "");
const nameDirty = computed(
  () => nameInput.value.trim() !== (names.value?.displayNameOverride ?? ""),
);
const savingName = ref(false);
const nameError = ref("");

async function updateName(displayNameOverride: string | null) {
  savingName.value = true;
  nameError.value = "";
  try {
    names.value = await $fetch<NonNullable<typeof names.value>>(
      "/api/me/display-name",
      {
        method: "PATCH",
        body: { displayNameOverride },
      },
    );
    nameInput.value = names.value?.displayNameOverride ?? "";
  } catch (e) {
    nameError.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
  } finally {
    savingName.value = false;
  }
}

const saveName = () => updateName(nameInput.value);
const resetName = () => updateName(null);

async function logout() {
  await clear();
  await navigateTo("/");
}
</script>
