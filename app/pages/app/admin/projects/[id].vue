<template>
  <div class="flex justify-center w-full">
    <div v-if="project" class="max-w-full w-250 px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/admin/projects"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> all projects
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">{{ project.name }}</h1>
        <p class="mt-1 opacity-70">
          by
          <NuxtLink
            :to="`/app/admin/users/${encodeURIComponent(project.owner.id)}`"
            >{{ ownerName }}</NuxtLink
          >
        </p>
      </UiCard>

      <img
        v-if="project.bannerKey"
        :src="`/images/${project.bannerKey}`"
        alt=""
        class="h-51 w-full object-cover border-4 border-black"
      />

      <dl class="border-4 border-black divide-y-2 divide-black">
        <div
          v-for="field in fields"
          :key="field.label"
          class="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]"
        >
          <dt class="font-semibold">{{ field.label }}</dt>
          <dd class="whitespace-pre-wrap break-words">
            <NuxtLink
              v-if="field.link && field.value"
              :to="field.value"
              external
            >
              {{ field.value }}
            </NuxtLink>
            <span v-else-if="field.value">{{ field.value }}</span>
            <span v-else class="opacity-60 italic">none</span>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const route = useRoute();
const id = route.params.id as string;
const { data: project, error } = await useFetch(`/api/admin/projects/${id}`);
if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: error.value.statusMessage,
    fatal: true,
  });
}

setAdminSubject(
  () => project.value && { slackId: project.value.owner.slackId },
);

const ownerName = computed(() => {
  const owner = project.value?.owner;
  return (
    [owner?.identity.first_name, owner?.identity.last_name]
      .filter(Boolean)
      .join(" ") || owner?.id
  );
});

const fields = computed(() => {
  const p = project.value;
  if (!p) return [];
  return [
    { label: "Description", value: p.description },
    { label: "Hackatime projects", value: p.hackatimeProjects.join(", ") },
    { label: "AI usage", value: p.aiUsage },
    { label: "Preexisting", value: p.preexisting ? "yes" : "no" },
    { label: "Demo URL", value: p.demoUrl, link: true },
    { label: "GitHub URL", value: p.repoUrl, link: true },
    { label: "Created", value: new Date(p.createdAt).toLocaleString() },
    { label: "Updated", value: new Date(p.updatedAt).toLocaleString() },
  ];
});
</script>
