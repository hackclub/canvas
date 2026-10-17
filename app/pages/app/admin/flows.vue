<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/admin"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> admin
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">flows</h1>
        <p class="mt-1 opacity-70">
          Replay what new people go through, on your own account. Nothing is
          reset, so you won't get the rewards again.
        </p>
      </UiCard>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="border-4 border-black p-5 flex flex-col">
          <h2 class="flex items-center gap-2 font-bold text-xl">
            <Icon name="lucide:door-open" /> setup flow
          </h2>
          <p class="mt-1 mb-4 opacity-70">
            The introduction, linking Hackatime and making a first project.
            Creating a project here makes a real one.
          </p>
          <UiButtonSmall
            to="/app/setup/introduction"
            icon="lucide:arrow-right"
            class="mt-auto self-start"
          >
            start setup
          </UiButtonSmall>
        </div>

        <div class="border-4 border-black p-5 flex flex-col">
          <h2 class="flex items-center gap-2 font-bold text-xl">
            <Icon name="lucide:message-square" /> interactive guide
          </h2>
          <p class="mt-1 mb-4 opacity-70">
            The dialogue that walks people through projects, the canvas, the
            shop and home. Starts on your most recent project.
          </p>
          <UiButtonSmall
            icon="lucide:arrow-right"
            class="mt-auto self-start disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!projects?.length"
            @click="startGuide"
          >
            start guide
          </UiButtonSmall>
          <p v-if="!projects?.length" class="mt-2 text-sm opacity-70">
            You need a project first.
          </p>
        </div>

        <div class="border-4 border-black p-5 flex flex-col">
          <h2 class="flex items-center gap-2 font-bold text-xl">
            <Icon name="lucide:zap" /> double pixels
          </h2>
          <p class="mt-1 mb-4 opacity-70">
            The deal from the "you haven't started yet" DM, on your own
            account: ships made before the end of the day after tomorrow
            pay double pixels (up to 250 extra), with the banner above the
            navbar. No DM is sent. It turns off once a ship uses it.
          </p>
          <UiButtonSmall
            :icon="boost?.until ? 'lucide:toggle-right' : 'lucide:toggle-left'"
            class="mt-auto self-start disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!boost || savingBoost"
            @click="toggleBoost"
          >
            {{ boost?.until ? "turn off" : "turn on" }}
          </UiButtonSmall>
          <p v-if="boost?.until" class="mt-2 text-sm opacity-70">
            On until {{ new Date(boost.until).toLocaleString() }}.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const guide = useGuide();
const { data: projects } = await useFetch("/api/projects");

const { data: boost } = await useFetch("/api/admin/boost");
const savingBoost = ref(false);
async function toggleBoost() {
  if (!boost.value) return;
  savingBoost.value = true;
  try {
    boost.value = await $fetch<{ until: string | null }>("/api/admin/boost", {
      method: "PATCH",
      body: { enabled: !boost.value.until },
    });
    // the banner in the layout
    await refreshNuxtData("boost");
  } finally {
    savingBoost.value = false;
  }
}

async function startGuide() {
  const project = projects.value?.[0];
  if (!project) return;
  guide.start(project.id);
  await navigateTo(`/app/projects/${project.id}`);
}
</script>
