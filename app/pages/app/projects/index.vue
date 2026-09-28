<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-8 py-3 space-y-4">
      <UiCard>
        <h1 class="font-bold text-3xl">projects</h1>
        <p class="mt-3">build projects, get pixels, draw on the canvas!</p>
        <div class="absolute top-8 right-8">
          <UiButtonSmall class="border-3 border-white" @click="openCreate">
            create new project
          </UiButtonSmall>
        </div>
      </UiCard>

      <div v-if="projects?.length" class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="project in projects"
          :key="project.id"
          :to="`/app/projects/${project.id}`"
          class="no-underline! block border-4 border-black p-5 hover:bg-black hover:text-white transition-colors"
        >
          <h2 class="font-bold text-xl">{{ project.name }}</h2>
          <p class="mt-1 opacity-70 line-clamp-2">
            {{ project.description || "No description yet" }}
          </p>
        </NuxtLink>
      </div>
      <p v-else class="opacity-60 italic">
        You don't have any projects yet. Create one to get started!
      </p>
    </div>
  </div>

  <UiModal v-model="creating" title="new project">
    <form class="space-y-3" @submit.prevent="createProject">
      <label class="block">
        <span class="font-semibold">What's it called?</span>
        <input
          ref="nameInput"
          v-model="name"
          maxlength="100"
          required
          placeholder="My awesome project"
          class="mt-1 w-full border-3 border-black px-3 py-2 outline-none"
        />
      </label>
      <p v-if="error" class="text-red-600">{{ error }}</p>
      <div class="flex gap-2">
        <UiButtonSmall type="submit" icon="lucide:arrow-right" :disabled="saving">
          create
        </UiButtonSmall>
        <UiButtonSmall @click="creating = false">cancel</UiButtonSmall>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});

const { data: projects } = await useFetch("/api/projects");

const creating = ref(false);
const name = ref("");
const error = ref("");
const saving = ref(false);
const nameInput = ref<HTMLInputElement>();

async function openCreate() {
  name.value = "";
  error.value = "";
  creating.value = true;
  await nextTick();
  nameInput.value?.focus();
}

async function createProject() {
  saving.value = true;
  error.value = "";
  try {
    const project = await $fetch("/api/projects", {
      method: "POST",
      body: { name: name.value },
    });
    await navigateTo(`/app/projects/${project.id}`);
  } catch (e) {
    error.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
  } finally {
    saving.value = false;
  }
}
</script>
