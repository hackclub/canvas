<template>
  <div class="space-y-2 p-6">
    <h1 class="text-2xl font-bold">make your first project</h1>
    <p class="mb-3">
      Everything you build in Canvas lives in a project. Name yours, you can
      change it and fill in the rest later. You'll get 3 pixels for it!
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "setup",
});

const name = ref("");
const saving = ref(false);
const error = ref("");

async function create() {
  saving.value = true;
  error.value = "";
  try {
    const created = await $fetch("/api/projects", {
      method: "POST",
      body: { name: name.value },
    });
    // Straight into the project, where they're asked to link their Hackatime projects
    await navigateTo({
      path: `/app/projects/${created.id}`,
      query: created.rewarded ? { rewarded: "1" } : {},
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
