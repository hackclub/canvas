<template>
  <div v-if="!created" class="space-y-2 p-6">
    <h1 class="text-2xl font-bold">make your first project</h1>
    <p class="mb-3">
      Everything you build in Canvas lives in a project. Name yours, you can
      change it and fill in the rest later. You'll get a pixel for it!
    </p>
    <form class="flex flex-wrap gap-2" @submit.prevent="create">
      <input
        v-model="name"
        :maxlength="100"
        placeholder="Project name"
        aria-label="Project name"
        class="flex-1 min-w-48 border-3 border-black px-3 py-1 outline-none"
      />
      <UiButtonSmall
        type="submit"
        icon="lucide:arrow-right"
        class="disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="saving || !name.trim()"
      >
        {{ saving ? "creating..." : "create project" }}
      </UiButtonSmall>
    </form>
    <p v-if="error" class="text-red-600">{{ error }}</p>
    <p class="opacity-60 italic">
      <NuxtLink to="/app">skip for now</NuxtLink>
    </p>
  </div>
  <div v-else class="space-y-2 p-6">
    <h1 class="text-2xl font-bold">all done</h1>
    <p class="mb-3">
      <template v-if="created.rewarded">
        You got <b>1 pixel</b> for creating your first project!
      </template>
      Link your Hackatime projects to it on its page, then head into Canvas to
      look around.
    </p>
    <div class="flex flex-wrap gap-2">
      <UiButtonSmall :to="`/app/projects/${created.id}`" icon="lucide:folder">
        open project
      </UiButtonSmall>
      <UiButtonSmall to="/app" icon="lucide:arrow-right">
        let me in!!
      </UiButtonSmall>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "setup",
});

const name = ref("");
const saving = ref(false);
const error = ref("");
const created = ref<{ id: number; rewarded: boolean } | null>(null);

async function create() {
  saving.value = true;
  error.value = "";
  try {
    created.value = await $fetch("/api/projects", {
      method: "POST",
      body: { name: name.value },
    });
  } catch (e) {
    error.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
  } finally {
    saving.value = false;
  }
}
</script>
